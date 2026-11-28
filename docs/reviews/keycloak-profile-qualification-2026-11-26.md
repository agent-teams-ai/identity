# Keycloak profile qualification and D3-A boundary

## Decision status

The accepted plan selects D3-A: direct GitHub/GitLab login plus a previously
admitted independent Keycloak-local factor before the declared protected
organizational operations. This requirement has not been reduced to a generic
MFA flag. The runtime candidate emits only `provider-session-control-v1`;
`independent-continuity-v1` remains closed until the provider mechanism and
every permitted mutation/recovery channel establish the stronger invariant.

This is an implementation qualification record. A source observation, an
engineering candidate and an executed native test are distinct evidence.
The exact test profile and pinned artifact are recorded in
[`deploy/keycloak`](../../deploy/keycloak/README.md).

## Native behavior that matters

The [Keycloak 26.8.2 administration guide](https://www.keycloak.org/docs/26.8.2/server_admin/index.html#application-initiated-actions)
describes re-authentication for application-initiated credential actions.
At the pinned source commit, inspect
[`AcrStore`](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/authentication/authenticators/util/AcrStore.java),
[`ConditionalLoaAuthenticator`](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/authentication/authenticators/conditional/ConditionalLoaAuthenticator.java),
and
[`ConditionalUserConfiguredAuthenticator`](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/authentication/authenticators/conditional/ConditionalUserConfiguredAuthenticator.java).

The available level and conditional flow depend on currently configured
credentials. That condition does not record that a stronger factor was
admitted in the past. Removing the last factor can therefore change the
available native flow without removing Identity's historical obligation.
The inference for this service is specific: native LoA configuration and a
theme alone have not established D3-A's monotonic post-loss rule.

[`AuthenticationManager`](https://github.com/keycloak/keycloak/blob/e514445f9dcdabc5bdcf67cab56c1e49655de067/services/src/main/java/org/keycloak/services/managers/AuthenticationManager.java)
and the native ACR/session mappers also distinguish authentication, SSO and
broker facts. A new access-token issuance does not independently prove that
the required local factor was just used. Requested ACR, an AMR string and
current credential counts must not be translated into an admitted proof
without a qualified, exact flow and provenance.

## Bounded implementation options

| Option                     | What must enforce the boundary                                                                                                                                                                                                | Tradeoff / admission condition                                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Restricted native channels | Permit only a proven supported set of native authentication and credential-management routes; keep Identity's monotonic admission history and exact policy.                                                                   | Smallest extension surface, but admissible only if real endpoint restrictions prevent weak enrollment/recovery through every other client and route. Hiding UI is insufficient.                                               |
| Narrow provider extension  | A small, version-pinned authenticator / required-action extension supplies guarded factor provenance and refuses post-loss bootstrap; Identity owns lifecycle, policy and receipts. Restrict all uncovered mutation channels. | Additional Java/provider maintenance, but preserves Keycloak's credential cryptography and UI. Must demonstrate the extension sees the relevant actions; an event listener alone cannot prevent Admin REST or delayed writes. |
| Ordinary profile first     | Keep the qualified ordinary login and deny protected organizational operations as insufficient proof.                                                                                                                         | Useful staged engineering delivery, but explicitly does not complete the selected D3-A scope. It must not be relabeled as a finished independent-factor implementation.                                                       |

The preferred next experiment is the restricted-channel option because it
can falsify whether the supported native boundary is sufficient before
introducing an extension. If any required public path bypasses the monotonic
admission rule, move to the narrow extension for that boundary. Do not build
a separate identity/credential engine or introduce an unreviewed broad SPI.

An inventory read is not automatically proof of which credential produced a
session. A proposal based on admitted credential IDs must handle concurrent
add/use/remove, provider mutation timing and administrative paths. One
readback after a timeout cannot settle an opposing delayed mutation.

## Channels that the experiment must cover

The admissible profile must account for ordinary and protected OIDC clients,
SSO-cookie reuse, direct grants, device/CIBA/token exchange, account console
and Account REST, AIA/required actions, email reset, recovery codes, social
link/unlink and first-broker-login, plus privileged Admin REST and emergency
operator actions. Disabling an unused grant is configuration; proving its
denial is native qualification. Disabling a button is neither.

The service must persist the historical stronger-admission state separately
from current factors. New ordinary sessions may bootstrap an account that
has never received stronger admission only under the prospective policy;
they cannot recover an old protected account. After loss, the account stays
in the explicit recovery/repair path until supported recovery establishes
new admission and invalidates the old fences.

Protected requests bind actual method/time, provider session, account
security epoch, attachment generation and configured resource/action policy.
Recovery, factor replacement or custody change cannot inherit an old proof.
GetTok's own team roles, API-key ownership and billing authorization remain
GetTok's responsibility. Existing configurable legacy TOTP is not an
automatic fallback for this central policy.

## Minimum falsifying native scenarios

1. A new account can perform prospective first-factor bootstrap, and that
   event does not prove ownership of pre-existing protected resources.
2. An admitted account loses every local factor. Ordinary broker login,
   AIA and account endpoints cannot silently create a new trusted factor or
   reset historical stronger admission.
3. An existing permitted factor can authorize replacement, while an
   ordinary-only session cannot. Wrong method, old authentication, another
   provider session or another operation scope is rejected.
4. SSO and refresh preserve the original relevant proof time; fresh token
   `iat` and requested higher ACR cannot renew it.
5. Concurrent enrollment/removal, recovery and account closure preserve
   one authoritative outcome. A delayed external write after timeout does
   not reopen a denied account.
6. Admin/break-glass routes either participate in the lifecycle fence or
   are explicitly restricted and force repair before renewed admission.
   Audit notification alone is not enforcement.
7. Direct GitHub/GitLab login remains available. Provider linking does not
   merge accounts by email or treat broker custody as independent proof.

## Execution evidence

The current source includes synthetic signed-JWT boundary tests and the
native `keycloak-profile.native.ts` fixture. The latter exercises real
Authorization Code, PKCE, nonce, code replay and workload separation against
the imported realm. Its local password fixture does not qualify GitHub/GitLab
brokering or a complete GetTok browser session.

Previous interrupted native attempts established startup only. After the
workspace restoration, the ordinary profile and actual Identity service
completed native qualification on 2026-11-26. These results do not admit the
stronger profile or claim a completed GetTok browser integration.

The successful checked-in command was `node tools/check-native-keycloak.ts`
against fresh loopback `keycloak_test` and `identity_test` databases. The
launcher applied the actual production SQL migration, started Keycloak,
ran both compiled fixtures, and emitted its final PASS only after graceful
provider cleanup. The enclosing test process also stopped its owned
PostgreSQL cluster. Exit status was zero.

| Observed component | Executed value                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keycloak           | 26.8.2, official archive SHA-256 `dd124787283918bc597628887168333465ee2a811a389e0003569e52be7e487f`                                                           |
| JVM                | Actual Eclipse Temurin 21.0.13.1+2-LTS; downloaded archive SHA-256 `bb8a93f9ae6e7a693b2b721e85dbeff26ae1a77447985a8d7afcdd9c7cf6222e`                         |
| Database           | Actual PostgreSQL 18.7 (`18.7-1.pgdg13+5` native package)                                                                                                     |
| Realm bytes        | SHA-256 `ee0e578a19533aff0bd78e72be1d58bc6628f8e8d4bd85d08e2c78020e8ba419`                                                                                    |
| Source state       | Working-tree implementation based on `63142e164669823f38f0db0c42a5789f711e2d7c`; this is a local executed result, not a fabricated CI result for that commit. |

The provider fixture passed real Authorization Code with S256 PKCE, nonce,
signature/issuer/audience verification through the production adapter,
userinfo subject/contact binding, code replay, wrong or missing PKCE and
human/workload grant separation. The service fixture started the actual
Get Modular/HTTP composition and exercised real Connect TCP plus PostgreSQL:
resolve, both status methods, original receipt replay, principal-class
denials, production suspend/enable, old-token and stale-receipt rejection,
and terminal closure.

The native run exposed two concrete composition faults that fixture-only
tests had missed: invalid runtime identifiers and passing the full resource
scope instead of its public resource context. Those were corrected before
the passing run. This is why production composition startup remains part
of the mandatory native gate.

Current native entry sources at that checkpoint had these hashes:

- `keycloak-profile.native.ts`: `df4ffcb7c8720ecbb138ef1b0a757abb1d6f7c4416185494bbf47295760c85a5`.
- `keycloak-service.native.ts`: `fb5cd38414fc21897539b15b6b5fc8d004f577a7cda8687bd02835a2984d6971`.
- `tools/check-native-keycloak.ts`: `3b513aabb56114adff82c81cb45c90c37dca5fb18c1ce1d9d003a5b85f158922`.

Every final CI execution must repeat this gate on its immutable commit and
record the realm digest it actually used. Formatting changes can change a
source digest; that does not retroactively change the recorded local run.
