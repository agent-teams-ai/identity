# Identity planning review record

> Earlier sections record the original publication checkpoint. The reopened deep-review section at the end records the later findings, corrected hashes and verification boundary.

Date: 2026-11-26, Europe/Kyiv. Scope: proposed architecture, bootstrap and
implementation sequencing, plus the separate Review Router consumer plan.
Reviewers are separate assistant agents and the coordinating author. This is
design/source review, not human approval, a GitHub APPROVED review, runtime
security certification or production admission.

## Review ownership

| Reviewer | Authored | Independently reviewed |
| --- | --- | --- |
| Coordinating author | Identity main plan, navigation and this record | Review Router integration plan and both source audits |
| Foundation reviewer | BOOTSTRAP and tooling research | Identity plan, module/HTTP audit; BOOTSTRAP review by this agent is self-review |
| Modules/HTTP reviewer | Module/HTTP source audit | Identity plan and complete BOOTSTRAP, including actual central checker/schema/cohort sources |
| Review Router reviewer | Review Router plan | Identity plan and cross-product protocol/session boundary |

## Round 1: findings and corrections

Three independent passes on the first complete Identity draft identified the
following concrete gaps. The first plan's SHA-256 was
`cddb198d2ee7ce9d73308e84dffe9838ac63a27d92ea6e939fb8fa44244dd86c`.
Similar findings from multiple reviewers are consolidated, not counted as
additional independent defects.

| Finding | Priority | Correction and implementation proof |
| --- | --- | --- |
| Old product cookie plus fresh attacker-controlled central login could satisfy migration wording | High | Recent proof of both exact owners, one bounded intent; T7 rejects the old-cookie counterexample |
| Missed suspend and enable events could revive an old session from a final active snapshot | High | Immutable issued security epoch and authentication cutoff; refresh never upgrades the old proof; T6 covers lost events and surviving SSO/refresh |
| Global logout could rely on a missed back-channel notification | High | Canonical account-wide logout advances epoch/cutoff; provider single-session logout remains a distinct scope |
| A delayed Keycloak mutation could apply after an opposing successor | High | Persist in-flight intent, retain an outcome-unknown gate across failover, prohibit conflicting successors without settlement/barrier evidence; no fictional provider CAS |
| Theme/adapter-only checks did not constrain Account Console, recovery or administrator mutation paths | High | Inventory every enabled path, enforce the same root policy, disable unsupported paths, qualify competing-channel final-root behavior |
| Batched status refresh lacked caller-to-account authorization | High | Self-only initial profile; dedicated workload scope/client and minimal user-proven ConsumerAttachment for bounded batch/feed access; cross-consumer rejection |
| Receipt-time TTL could extend stale active authority | High | Source-bound expiry and conservative request-start budget; delayed response cannot renew the window |
| Package root could own feature modules contrary to adopted CMS | Medium | Feature-owned composition/groups, explicit Host/public-group wiring and composition/tests-only GM imports; separate CMS adoption/digest |
| Some alternatives lacked their own migration effect and falsifier | Medium | Compact D1–D3 per-option migration and counterexample tables |
| Navigation and actual review record were not yet assembled | Medium | README, canonical AGENTS, thin CLAUDE pointer and this factual record |

The independent Review Router pass additionally checked existing IDs, GitHub App
permission semantics, GitLab instance attribution, #1007 overlap, additive
migration and compatible rollback. Corrections align the shared scope names,
consumer-status authorization, epoch/cutoff and delayed-response semantics. The
author's extra pass made central OIDC refresh concurrency explicit rather than
assuming the session adapter implements it automatically.

## Round 2

All three separate reviewers read the corrected Identity plan. The Foundation
and modules/HTTP reviewers also independently read the Review Router plan; its
author's cross-plan pass is counted only as independent for Identity. The
coordinating author's earlier RR pass checked source ownership, migration,
session authority and compatibility rollback. BOOTSTRAP received the separate
modules/HTTP review, rather than relying only on its author.

The second-round input hashes were
`2f6588194ce1039b8d3034efb2460748916d55a343b3691c8ef7e5a8cb1a88e9`
(Identity) and
`9a1fc34c346579951a4ea16426ee7ce0fb9258ee1bf4c37fd2bb33d35d423234`
(Review Router). The reviewers confirmed the high-priority first-round fixes
and found the following narrower remaining inconsistencies:

| Finding | Final correction |
| --- | --- |
| A detached consumer could still receive self-status evidence without formally reactivating its row | Both self and workload paths require the live attachment; an old self token receives no usable active lease; explicit fresh reattachment is required |
| Event-delivery wording reopened a broadcast alternative | Live and replay delivery use the same recipient attachment set |
| Group assembly was conflated with contract republication | Parent composition assembles child groups; curated parent exports declare each contract/descriptor republication edge |
| RR central PKCE wording allowed an implicit downgrade | Central Keycloak login requires S256 PKCE; the real adapter spike must prove it |
| RR Stack and Prisma wording overstated version authority | Stack owns technical tools; product manifests/locks own runtime versions; Prisma manifest range is distinguished from locked resolution |
| Some logout/attachment wording was not identical across the two plans | Canonical epoch/cutoff global logout, provider-native scope, detach tombstones and post-cutoff proof now agree |

After these edits, all three reviewers inspected the targeted final changes and
verified the hashes below. They reported no unresolved material design or
documentation blocker in their reviewed scope. That result means the requested
planning Draft PRs are reviewable; it does not establish that a future Keycloak
configuration, provider extension, migration or production system is correct.

## Final reviewed document identities

| Document | SHA-256 |
| --- | --- |
| Identity architecture after second-round closure, before final source-provenance correction | `d4de28a235be00f17b1994e31c2d331eda46ae7044520274ace186b8c8b630c2` |
| Final Identity plan including the independently checked GetTok provenance correction | `10fda9097aa22c1aa92e585ac965e61fd615b4fe960041d39f6de95ec579996e` |
| BOOTSTRAP after round-two closure, before the final governance freshness correction | `7743661a56a1558a9f04d3e2859bd59ccec3afa4aa59913fca565d451e18acaf` |
| Module/HTTP audit including the source-only LMU refresh | `6b2f5792508f57eafa4f4442a33aa9491dd040610d6f70a0d7a138b5c208a2b8` |
| Review Router integration plan | `dfd7cec89a266024c3424dfd9b8aebb8818a02edd3648cdd834e1e53d1b9fa24` |

These hashes identify the substantive reviewed documents. This review record,
navigation and PR metadata are separate reporting surfaces and do not hash
themselves. Review Router retains its own consumer-side review record.

The final source refresh found one additional provenance error: the earlier
GetTok row named a TokenRouter upstream revision as the consumer fork's main.
The Foundation reviewer independently checked the actual fork source at
`287d1751564de571a35ec847634a62cb47dd21d7`, its OIDC entrypoints and identity/user
schemas against supplemental upstream `4ced45bb1854eb3296015fb4b092b64a8c263b46`.
The final plan distinguishes those coordinates and cites the fork's actual
schemas. Existing Go OIDC, local identity/balance ownership and the proposed
adapter direction remain supported. No full upstream sync or new runtime
dependency is inferred. The architecture and RR contracts are otherwise unchanged.

## Freshness and documentation verification

Before publication, GitHub reads confirmed unchanged main heads for the central
organization repository, Foundation, GM, EF, LMU, Discord, Platform, Orchestrator
and Review Router. Relevant PR states were re-read. RR #1007 advanced only its
private usage-retention source classification and related plan note to
`237c802358396414859366520cbb58fb07450004`; the consumer plan records that narrow
delta. LMU #4 advanced to `1b1891679da90f13ab3e9ea2e57eb8b3e9627aa1`; its
additional TEST/packed-reference work is documented in the audit, with private
package status preserved. Central #425 is merged prerequisite documentation,
not activation of a newer managed Docs cohort. The other cited reviewed
GM/EF/central/Foundation/RR proposal states did not change the adoption decisions.

Documentation checks cover all ten new/changed Markdown files and 67 local
references before the external source-provenance note: local targets
and used anchors, final newlines, trailing whitespace, code-fence balance and
diff scope. `git diff --check` is the whitespace gate. No formatter installation
or repository-wide runtime suite is required merely to publish these plans.

## Verification boundary

This work reads current source/package observations and designs implementation
gates. The future scenario matrix has not been executed: no Identity runtime,
Keycloak deployment, database migration or production login was created.
Foundation admission, package qualification and remote enforcement remain
separate future evidence axes. Unresolved implementation decisions are explicitly
owned by P0–P7 and the corresponding RR phase, including actual provider
capabilities, bootstrap admission, numerical operational targets and retention.

## Continuation check after the module PR merges

A later source check at 02:42 Europe/Kyiv confirmed that GM #256, Extension
Foundation #68 and LMU #4 have merged. Their exact new main revisions, inspected
catalog/manifests and unchanged public package observations are recorded in the
[source-freshness addendum](../research/modules-source-freshness-2026-11-26.md).
It supersedes the earlier open-PR state, while retaining the audited plan and
source evidence. No public EF/LMU production contract was introduced, so the
reviewed architecture, API and adoption gates are unchanged.

The continuation acceptance pass independently rechecked the two published main
plans and review records, all 67 pre-existing local references and their
cross-repository links. It found no missing original requirement, false runtime
PASS, unfilled authoring placeholder or new material design blocker. The new
addendum and its navigation are separately checked as documentation. Hosted
Review Router CI results belong to that PR's exact head and are recorded in its
PR verification note, not inferred from this source review.

## Final source and governance closure

At 04:17–04:19 Europe/Kyiv, the three reviewers performed a bounded final source
refresh while the already-started external bot review was completing. The
[source-freshness addendum](../research/modules-source-freshness-2026-11-26.md)
records new central, LMU and ReviewRouter revisions and unchanged public package
versions. The original audited source coordinates remain reproducible evidence.

Central #423 has merged; BOOTSTRAP now describes its actual scoped policy.
Identity is absent from the exception list, so no new bypass permission or
installed enforcement is inferred. The old BOOTSTRAP hash above deliberately
identifies the previously reviewed version. The corrected version receives a
separate targeted review. Its SHA-256 is
`c18945f700cf0a107b5e9b9ed9de2c311fa063d3c0a0213d3ea56adecd9fcd11`.
The core Identity
plan, module/HTTP audit and ReviewRouter plan bytes are unchanged.

External ReviewRouter bot coverage is reported separately in its PR metadata.
Its two completed attempts encountered HTTP 503 and `relay_saturated` before
dispatching the model; neither produced accepted coverage or approval. They
do not count as independent design-review passes. The actual independent
reviews described above and the successful applicable Draft CI gate retain
their stated scope; skipped runtime checks are not treated as executed.

The modules/HTTP and ReviewRouter reviewers independently accepted the four-file
freshness correction after checking the new source deltas, current central
policy, historical/current document identities and verification boundaries.
They reported no material finding. This final acceptance paragraph records
their completed review; it does not add another architecture-review pass.

## Reopened deep review — 26 November 2026

The owner requested a deeper consistency/security review and explicitly limited
the task to documentation. The previous final-reviewed hashes above remain a
historical checkpoint. This pass found real omissions despite that earlier
acceptance; it supersedes the earlier confidence for the affected guarantees.

### Independent work actually performed

Three reviewers examined the two plans separately from the coordinating author:
security/proof and takeover scenarios; lifecycle/consumer delivery and phase
dependencies; Foundation/module architecture and source freshness. The Foundation
reviewer authored the BOOTSTRAP/package refresh, so that author's checks of those
edits are self-review, not a separate independent approval. The coordinating
author checked the shared contracts, source deltas and exact publication content.

First-pass findings were reconciled in both owning repositories. Second-pass
reviewers read the published corrected candidates at Identity
`22f98035de1b8f006c3b2aa58a3878ebcfcf23d5` and ReviewRouter
`8f911716dca510965d5901c2ae9a7b7f951081a9`. They confirmed the substantive
first-pass fixes and identified the three narrower residual issues listed below.
This is documentation/design review by separate assistant agents; it is neither
human approval nor a GitHub APPROVED review.

### Findings and corrections

| Priority | Counterexample or inconsistency | Corrected requirement |
| --- | --- | --- |
| P1 | Fresh broker/OAuth timestamp was treated as recent factor authentication | Two qualified proof classes and explicit ordinary migration versus incident recovery policies |
| P1 | Detach/reattach could revive old product sessions | Immutable issued attachment generation in session/status/cache/late-response fences, separate from account epoch |
| P1 | Closed central owner could be treated as an unbound legacy user | Never-centrally-bound predicate, retained history and repair/transfer-required conflict |
| P1/P2 | Closure lacked a bounded participant and late-write protocol | Existing account operation freezes manifest; own scoped receipts and a committed product terminal fence precede completion |
| P2 | GetOperation authority after closure was undefined | Operator-only detailed progress by default; bounded user receipt is optional, ordinary sessions remain closed |
| P2 | P1/R0/P5 publication requirements formed a cycle | Versioned packed TEST candidate, consumer qualification, then published production artifact |
| P2 | Absolute post-cutoff promise contradicted bounded staleness | Pin accepted snapshot; known newer state wins, original source/request-start deadline bounds older evidence |
| P2 | Generic scaffolding was assumed to generate DDD features | Package-boundary recipe only; real feature/composition/FMS/CMS source authored under the gates |
| P2 | CMS and resource-close semantics were underspecified | Forbid own public contracts in inner layers; close callbacks/waiter state do not prove physical release |
| P2 | Source/package observations had advanced | Foundation4.0.2/FMS0.4.3; RR f20a75ed/Prisma7.9.0; preserve historical evidence and unresolved bootstrap admission gaps |

Second-pass residual corrections:

1. **First factor / add-only root bootstrap.** An unrestricted social-only account
   can use an explicitly admitted bounded bootstrap profile; it inherits the
   original social-root risk. Persist prior stronger-profile admission rather
   than deriving eligibility from the current factor count. The exception cannot
   reopen after factor loss, remove an established root, clear incident
   restrictions or prove earlier legacy ownership. First enrollment and prohibited
   reuse share the existing T3 family; ordinary social login remains available.
2. **Cleanup membership outlives routing history.** Preserve the minimal
   consumer/account cleanup relation while in-scope product data or an obligation
   may remain. If an explicitly accepted retention decision removes it earlier,
   expose limited/unknown coverage; absence never proves not-provisioned or
   complete cross-product erasure. No discovery service or provisioning ledger
   was added.
3. **Residual all-path scaffolding wording.** The prospective tree now limits
   Plan/Apply/Receipt to actual eligible package-boundary recipes. Feature layout,
   composition and FMS/CMS facts are reviewed source changes, consistently with
   P1, BOOTSTRAP and AGENTS.

The owning PR descriptions record the status and outcome of the targeted final
check and current-head hosted CI, with exact commit identities.
The old hosted results are not transferred to a new head. This record identifies
the substantive corrected bytes below; it does not hash itself or infer successful
runtime qualification from reviewer agreement.

### Corrected document identities

| Document | SHA-256 |
| --- | --- |
| Identity architecture and implementation plan | `600d2e8448069dc5de821c38bc38e8c1d09c3001e686e2c261ae920d3a741f36` |
| ReviewRouter integration plan | `e79ea56d0a94e98e68cbf1a32f584280b6d89b8ad0f0dd4208f531ba798fd335` |
| Identity BOOTSTRAP | `58904cf6a4d5f1ae1fc21a9a721d9405df2e8a863cf4686ab59254c1d42ee129` |
| Identity dated source-freshness record | `a405c140b11cf2091287f20b931b1fe7f6e47cd511639278e005f394339b758c` |

### Verification method and limits

The reopened pass checked exact UTF-8 content for final newlines, trailing
whitespace and balanced fences, and resolved local Markdown targets against
the planned files and exact Git trees, including used anchors. It used direct
content/tree verification; the earlier `git diff --check` results above remain
historical, not reruns falsely attributed to this pass. Published source
candidates were fetched back and matched exactly; remote incremental file
scope contained only the intended Markdown documents. Final publication
verification and author/committer identity belong to the exact heads recorded
in the PRs.

The implementation test families were amended with discriminating counterexamples,
not executed. No runtime source, database migration, service scaffold, dependency
installation, Keycloak/provider registration, production rollout or merge was
performed. Foundation consumer admission, proof-provenance enforcement, native
provider behavior, retention decisions and the operational freshness target
remain concrete P0–P6 / R0–R6 implementation gates. They are not blockers to
reviewing these complete proposed plans.

## Additional IAM cross-product review — 2026-11-26

This is a later pass, after the historical checkpoints above. Three actual
independent critics used **gpt-6.1-sol, xhigh**: account security, product/authority
boundaries, and ReviewRouter migration. They read Identity `ae61c972c8e4b40062c36dcc13c8075a5e1b002e`
and ReviewRouter `5c6b78776244d22c30a6d02aa05a0fa8c7d52959`, then cross-checked
each other's counterexamples. The coordinator re-read the exact owning clauses
and primary sources. No previous critic result is represented as a new run.

The approved expanded Identity architecture, direct GitHub/GitLab login, local
product ownership and standalone/Fully Local independence pass this comparison.
The [shared research](https://github.com/agent-teams-ai/engineering-research/blob/578b166650b916efa51f011598a42fabadaeff2f/docs/studies/identity-provider-evidence.md)
preserves the earlier 18-question alternatives and the owner's newly endorsed
directions. It is not provider qualification or implementation authorization.

| ID | Disposition |
| --- | --- |
| IAM-N26-01 | Open P0/P2 trust-profile choice, now explicit: social-root custody can change after enrollment; unknown custody is not proof of neutral recovery. D3 contains three scoped options and the A-to-B negative experiment. |
| IAM-N26-02 | Clarified in both plans: first attachment/history registration and closure participant capture serialize through the same Account lifecycle gate. The consumer is included or the new admission loses; test both orders with delayed responses. |
| IAM-N26-03 | Corrected consumer wording: only operations with the same proven native identity promise convergence. A deliberate central-only new user may later hit a safe native-identity ownership conflict; no automatic merge. |
| IAM-N26-04 | Open P0/R0 session-control contract, now explicit in D8 and consumer behavior: account-status renewal does not prove a native SSO/client session remains active after lost logout delivery. Three finite-scope alternatives are recorded. |

These are two precise plan fixes and two retained admission choices, not four
demonstrated vulnerabilities. The earlier generation, proof-strength, bootstrap,
closure-fence and retired-owner corrections remain valid. Root-removal/recovery
session invalidation is included in the operation inventory without claiming a
separate confirmed defect.

Updated substantive document SHA-256 values:

| Document | SHA-256 |
| --- | --- |
| Identity plan | `14e3d84985af996e4e4ed0d429e4ab636394cd74fc97712c0750f945b6641903` |
| ReviewRouter plan | `99866dedddc77121f7fa231612fc460f7a8236fcbc722013593fba54c26d3695` |

This pass changes Markdown only. The future transaction, provider and browser
counterexamples are specified, not executed. Old-head CI 45834320649 remains
historical: two jobs succeeded and ten were skipped under Draft policy. It cannot
qualify the new head or real authentication. The current PR description records
the new head's publication and applicable checks separately. No service code,
dependency, migration, provider registration, deployment or merge is authorized
or performed by this review.

## Owner-selected D3-A and implementation handoff — 2026-11-26

This later checkpoint follows the open-choice review above. The owner selected
D3 continuity option A, with progressive independent proof for protected
organizational use and a future path toward scoped enterprise authentication.
The alternative profiles remain preserved. The selected direction does not
accept a numerical proof/freshness horizon, D6 legacy-ownership policy, D8's
additional session-control policies, or an unqualified provider mechanism.

Two actual gpt-6.1-sol xhigh critics re-read the current plans for implementation
readiness, scope and sizing. Their bounded review identified the necessary
handoff detail: P0/R0 must map protected resource/actions and session assurance;
P2 must qualify enrollment/recovery and real provider proof before dependent
admission. Identity P0 and bounded P2 fixtures can start first; substantive P1
and RR R0/R1 retain the exact prerequisites in the phase table. This is a
bounded first release on the intended architecture. P7 and enterprise breadth
are later scope, while the relevant P2-P6 / R2-R6 release evidence remains required.

The growth contract preserves AccountId and product IDs, permits versioned
proof/authority integration and forbids a policy change from silently widening
existing sessions. No zero-refactoring guarantee or general identity/grant
migration framework was introduced. The estimate clarification distinguishes
ReviewRouter's mixed non-test lines from pure production TS and prevents
counting D3's overlapping cross-product estimate twice.

Current substantive document SHA-256 values:

| Document | SHA-256 |
| --- | --- |
| Identity plan | `572e55379f7137b74c76e71114ec4ab7a5a7b6cfde061c47e547f591a74453ab` |
| ReviewRouter plan | `37c8acf8261360698f35862a828eca158ad31ba2e39be0e3de927b3dd326eac5` |

The coordinator checked UTF-8 contents, final newlines, trailing whitespace,
fence balance and the bounded Markdown delta. Existing local link targets were
unchanged. No runtime source, migration, dependency, provider configuration,
deployment or merge is part of this documentation update. Prior-head CI and
hashes remain historical; the PR descriptions record new-head delivery evidence
separately. The selected policy is not an executed E2E or provider qualification.
