# Identity planning review record

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
