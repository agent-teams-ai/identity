# Identity v1 TEST candidate — GetTok first consumer

Baseline: the accepted planning head
[`deb399260bea43e8486e2b6c2c35efeb659e572e`](https://github.com/agent-teams-ai/identity/tree/deb399260bea43e8486e2b6c2c35efeb659e572e).
This document specifies the first implemented protocol slice, not completion
of every phase in that plan. GetTok is the first consumer. Review Router's
product integration remains a separate later task.

The authoritative wire source is
[`identity.proto`](../../packages/contracts/proto/identity/v1/identity.proto).
Generated TS and Go bindings derive from it; applications must not maintain
lookalike DTOs. The initial schema SHA-256 is
`3b2b7bbabcc9636031c92a049adeca026ba5ba11abaf3a149f94025cc370180b`.
The terminal-purpose extension has schema SHA-256
`543c240b8b935fca270d86455dd80f0b484603807f219e6cfbd02f7c7b3e37f0`;
its bindings are produced by the same pinned native generators.

## Actor and operation boundary

| RPC                | Authenticated caller                                        | Effect and limit                                                                                                                                            |
| ------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ResolveSelf`      | Admitted human client, `identity.resolve:self`              | Resolve the server-derived authority subject and atomically create its first consumer attachment; return status and an immutable session admission receipt. |
| `GetSelfStatus`    | Same admitted human permission                              | Observe an existing live attachment. Never create or reattach an account.                                                                                   |
| `GetAccountStatus` | Separately admitted workload client, `identity.status:read` | Observe only an account already attached to that workload's configured consumer. Never obtain or renew human proof.                                         |

Authentication is Bearer transport metadata. The verifier requires the exact
configured issuer and `identity-api` audience, then derives the actor kind and
consumer from the admitted client registry. Request bodies cannot choose a
human subject, issuer, consumer or authority incarnation. A service account is
not a human with elevated permissions. Unknown, foreign, detached and unowned
references receive the same permission denial from the machine status API;
it provides no account directory.

`ResolveSelf.idempotency_key` is bounded to 128 UTF-8 bytes and belongs to the
authenticated subject and consumer. It identifies one attempted admission,
not a refresh mechanism. Stable references are opaque, bounded to 256 UTF-8
bytes, case-sensitive and never derived from email or mutable usernames.

## Terminal-purpose cleanup participation

`IdentityClosureService` exposes `ListPendingClosures`,
`ListRepairRequiredClosures` and `ReportClosure` through the existing account
capability and HTTP Host. The operator admits a separate client with
`kind: "terminal-workload"`, a fixed consumer and the narrow
`identity.closure:participate` permission. The exact issuer, `identity-api`
audience and token lifetime checks remain required. Human clients, ordinary
status clients and terminal clients cannot substitute for one another, even
when a token contains an additional scope string. This permission does not
grant ordinary status, account management or a global directory.

Each list is scoped to that authenticated consumer's frozen manifest. A detached
consumer retains its own terminal obligation while ordinary live status remains
denied. Requests require `limit` from 1 through 16 and an empty or canonical
account-ID cursor. Responses stay within the Host's existing 16 KiB limit.
`next_after_account_id` is the final account ID when a page is full; a full final
page can be followed by an empty page. Restart later sweeps from the beginning.
Pages are observations of pending/repair items, not a complete erasure report
or settlement instruction. No retention TTL or destructive purge is introduced.

The participant reference contains the account/authority incarnation, closure
revision, captured participant generation and `manifest_version = 1`. The
account/incarnation/revision tuple identifies the existing closure operation;
version 1 describes its captured manifest contract. There is no second operation
ledger. Positive revision/generation values must fit PostgreSQL signed bigint;
zero, overflow, missing references and unknown manifest versions are rejected.
The consumer is never selected by a request field.

`ReportClosure` records only `not-provisioned`, `erased` or `repair-required`.
The first two are assertions by the admitted product: that product must first
commit its own closed-account fence and settle work that could recreate data.
Identity does not perform or prove physical product erasure. `retained-by-policy`
is reserved and rejected until the owner qualifies the class/obligation/owner
evidence contract. A repair receipt remains visible and cannot be changed to
an erasure receipt by ordinary replay.

The database accepts only CLOSED state, exact authority/revision/generation and
either a pending item or the identical previously recorded outcome. The same
receipt can recover a lost response; a different outcome never overwrites it.
Unknown, foreign, stale, conflicting or contended reports receive the same
non-enumerating permission denial. Uncertain transport failure does not prove
that a report was rolled back; retry only the exact original receipt.
Workload expiry includes the configured clock allowance: read authorization is
checked against database time after the bounded read, and mutation authorization
is checked after nonblocking receipt-row acquisition. Waiting never renews a
credential. Detailed cross-product/operator progress and product cleanup
handlers remain separately qualified work.

## Status, fences and observation bounds

`AccountReference` is the pair `(account_id, authority_incarnation)`. A new
authority incarnation must be explicitly admitted; an issuer URL retained
after a realm restore must not silently inherit the previous identity space.

`AccountStatusEvidence` includes its consumer, eligibility, account revision,
security epoch, authentication cutoff, attachment generation, reattachment
cutoff, observation time and absolute validity deadline. Revision, security
epoch and attachment generation start at one and increase monotonically.
UNKNOWN/UNSPECIFIED enums, zero fences, missing timestamps, impossible date
ordering and an unexpected consumer/incarnation are unusable evidence.

All `uint64` values are TypeScript `bigint` and Go `uint64`; ProtoJSON uses
decimal strings. Never convert revisions to JavaScript `number`. Timestamps
retain their declared precision. The shared vector tests numbers above
`Number.MAX_SAFE_INTEGER` and nanoseconds.

The TEST engineering bound is 60 seconds total, including 5 seconds of clock
uncertainty. The source issues at most 55 seconds from its authoritative
database observation. A consumer derives its deadline conservatively from
the source's `valid_until`, request-start monotonic budget, uncertainty,
original credential/proof expiry and its local session cap. Network delay
does not mint a new receipt-time TTL. These are bounded TEST defaults, not
an assertion that the user selected production freshness numbers.

Each local session keeps the originally issued security epoch, attachment
generation, authority incarnation and proof. Status observation may advance
a durable high-water mark; it cannot rewrite those session facts. Reject an
older revision, equal-revision contradictory facts or a newer revision with
lower fences. A lost suspend/enable or detach/reattach event must still leave
the old session invalid when the latest state is ACTIVE. CLOSED is terminal
for the original AccountId. No stale ACTIVE response may reopen a previously
observed denial.

The authoritative transaction serializes first attachment, reattachment and
closure. If attachment wins, closure captures it in the cleanup manifest. If
closure wins, no attachment or usable active admission can be committed.
Binding, attachment history, receipt, lifecycle facts and durable effects
must agree at the transaction boundary.

## Admission and native session lifetime

`SessionAdmission.authority_session_id` is the verified Keycloak `sid`.
GetTok's local opaque session identifier is a different value and owner.
`authenticated_at` is the qualified authentication fact, never a substituted
token `iat`. The receipt binds the exact profile, policy ID and version to an
absolute deadline. An idempotent replay returns the original bounds only
after current authoritative account/attachment validation. It must not
remint expiry, upgrade a fence or return a known-stale active receipt.

The first qualified profile is `PROVIDER_SESSION_CONTROL_V1` with
`gettok-ordinary-login`, version 1. It proves control of the admitted ordinary
provider session only. It grants no product role, team permission or
independent organizational continuity. Its deadline is capped by the actual
human access-token expiry (300-second TEST maximum), regardless of workload
status calls. The 8-hour provider-control age limit is an additional ceiling,
not a replacement for that token expiry.

Until upstream refresh/native session liveness is separately qualified,
renewal requires a newly authenticated human `ResolveSelf` admission and
the appropriate current fences. A workload status read cannot keep an ended
Keycloak session alive or renew its proof. Individual provider logout is not
equivalent to an account security-epoch change. Production must either keep
the admitted short proof lease or qualify explicit native-session liveness
and durable back-channel logout/reconciliation before extending it.

`INDEPENDENT_CONTINUITY_V1` is reserved and remains unavailable. Its intended
policy is `gettok-protected-organizational`, version 1, with an explicitly
configured resource/action scope. Neither `acr`, `amr`, current factor count,
`mfaEnabled`, a requested `acr_values`, nor a fresh token issuance upgrades an
ordinary receipt. A future version cannot widen old receipts' scope.

The selected D3-A requirement is a previously admitted independent local
factor for the declared protected operations. First-factor enrollment is
prospective bootstrap, not proof of historical ownership or recovery. The
monotone fact that stronger admission previously occurred survives factor
loss; zero currently registered factors must never reopen weak bootstrap.
Recovery and authority-custody changes require their separate lifecycle
policy. Provider-local assurance does not duplicate GetTok authorization.

## Errors and caller behavior

Connect transport codes distinguish malformed input (`invalid_argument`),
invalid credentials (`unauthenticated`), denied scope/reference
(`permission_denied`), unmet lifecycle/proof conditions
(`failed_precondition`), conflicting idempotency use (`already_exists`) and
expected-revision conflict (`aborted`). Infrastructure uncertainty is
`unavailable`, never an allow decision. The typed reason detail records
suspended, closed, reattachment required, authentication after cutoff,
insufficient proof, recovery/repair required, conflict or expired admission.

An unknown enum, absent detail, timeout or unreadable status must not fall
back to legacy TOTP or a cached success outside its admitted deadline.
Retries preserve the original idempotency key and bounded deadline. HTTP
cancellation does not prove a transaction or provider mutation was undone.

The complete lifecycle's external mutation protocol separately needs a
durable `outcome_unknown` state. A worker lease expiry or one readback cannot
fence a delayed provider write that opposes a newer operation. Admission
remains denied until an actual supported barrier, settlement or explicit
repair establishes safety. The status and terminal receipt transport does not
implement those provider mutation endpoints.

## Minimum falsifying scenarios

The implementation gates must demonstrate simultaneous first admission,
same-key receipt replay, expired replay, closure racing attachment, current
state overriding stale receipts, suspension followed by enable with lost
events, detach/reattach with lost events, unknown/delayed status, and subject
or consumer substitution. The boundary tests cover wrong issuer/audience,
ID tokens, unadmitted clients, human/workload confusion, required timestamps,
unbounded token life and unqualified assurance claims.

Real provider qualification additionally exercises Authorization Code with
S256 PKCE, state/nonce, code replay, wrong verifier, actual JWT verification,
workload separation and disabled alternative grants. Synthetic signed JWTs
are useful boundary tests; they are not evidence that the deployed provider
flow or the complete GetTok browser callback works. Each native result must
record the exact profile, provider/runtime versions and source revision.
