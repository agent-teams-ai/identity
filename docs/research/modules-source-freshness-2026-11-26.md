# Source freshness after qualification and governance updates

Observed on 2026-11-26 at 02:42 Europe/Kyiv (00:42 UTC). This supplements the
[original module and HTTP source audit](modules-and-http-source-audit-2026-11-26.md).
The original inspected revisions and document digests remain reproducible
research evidence. The later observation below supersedes their open-PR status;
it does not retroactively adopt new runtime contracts.

## Newly merged source

| Owner | Merged change | Current main at this observation | Relevant result |
| --- | --- | --- | --- |
| Get Modular | [#256](https://github.com/agent-teams-ai/get-modular/pull/256) | `a5f41853200aed26d692e89d768185013d629a12` | Two authoring/quickstart guides link to the portable qualification reference; public packages and CMS document are unchanged |
| Extension Foundation | [#68](https://github.com/agent-teams-ai/extension-foundation/pull/68) | `312782a7a74515682a324dc0d89f43394ea1618d` | TEST matcher, source qualification and documentation; no released public SPI or production Host |
| Live Module Updates | [#4](https://github.com/agent-teams-ai/live-module-updates/pull/4) | `dd8de63651e79e4737e1a0e412d2c74e79e0b646` | Private portable authoring reference, packed consumer probes and Node/browser Host fixtures; no public update coordinator |

The independent source refresh inspected the relevant changed paths. The
Extension Foundation [package catalog](https://github.com/agent-teams-ai/extension-foundation/blob/312782a7a74515682a324dc0d89f43394ea1618d/architecture/package-catalog.json)
still has an empty `packages` array. Its
[delivery plan](https://github.com/agent-teams-ai/extension-foundation/blob/312782a7a74515682a324dc0d89f43394ea1618d/docs/architecture/plugin-delivery-plan.md)
retains the release boundary. LMU's
[core artifact](https://github.com/agent-teams-ai/live-module-updates/blob/dd8de63651e79e4737e1a0e412d2c74e79e0b646/tests/qualification/portable-document/artifact/package.json)
and [GM adapter](https://github.com/agent-teams-ai/live-module-updates/blob/dd8de63651e79e4737e1a0e412d2c74e79e0b646/tests/qualification/portable-document/adapter/package.json)
both remain `@fixture/*`, `0.0.0`, `private: true`. Source merge does not
establish publication, a supported consumer API or Identity runtime qualification.

## Public package observation

The registry observation at 00:42:23 UTC did not change the audited cohort:
Core/Assembly 0.8.0, Resources 0.2.2, Conformance 0.5.2, Observation 0.2.1,
Effect 0.1.1, Stack Toolchain 0.3.1, Engineering Foundation 4.0.0 and the FMS
checker 0.4.1. The lifecycle-kernel latest endpoint still returned HTTP 404.

Central `.github` main remained `755c8515a5d106402a7e9e2cff621fb1fdc855cf`;
Engineering Foundation main remained `fac03920e50ebde038ae415edeb7aa9e3d610ada`.
The documented central Stack/coverage-v5 and managed Docs admission gaps
therefore remain applicable. This refresh does not select a new cohort or change
the exact first implementation qualification obligation.

## Effect on the Identity plan

The [implementation plan](../plans/identity-service-implementation-plan.md)
remains applicable: use released GM contracts in feature-owned composition;
keep EF/LMU integration behind real outer adapters; qualify and adopt public
contracts when they are released. P7 remains conditional on that release and
its actual consumer evidence. There is no reason to copy the private fixture
packages into Identity or change the reviewed inward dependency direction.

The Foundation reviewer performed the bounded freshness check; the coordinating
author independently read the current catalog/manifests and merged PR metadata.
These are source and registry observations. The reference tests were not
re-executed, and this addendum does not claim new runtime, deployment or public
package qualification.

## Final cross-repository refresh

Observed on 2026-11-26 at 04:17–04:19 Europe/Kyiv (02:17–02:19 UTC).
The following later observations supersede the earlier current-head and open-PR
states where stated. Immutable earlier snapshots remain the evidence for their
original audits. Three separate reviewers inspected only the new deltas and
the relevant current authority, package or consumer records.

| Source | Current revision at this observation | Material effect |
| --- | --- | --- |
| Organization `.github` | [`7ad5abbf5a8dade79f91f3e6f06481070b966a9e`](https://github.com/agent-teams-ai/.github/commit/7ad5abbf5a8dade79f91f3e6f06481070b966a9e) | #423 and #428 merged; scoped author-policy compatibility and a runtime-admission caller/install record |
| Engineering Foundation | `fac03920e50ebde038ae415edeb7aa9e3d610ada` | Main unchanged |
| Get Modular | `a5f41853200aed26d692e89d768185013d629a12` | Main unchanged |
| Extension Foundation | `312782a7a74515682a324dc0d89f43394ea1618d` | Main unchanged; the current package catalog remains empty |
| Live Module Updates | [`b5b54d7958022ecc4e631e538bd2eb2fe707a8af`](https://github.com/agent-teams-ai/live-module-updates/commit/b5b54d7958022ecc4e631e538bd2eb2fe707a8af) | One further TEST/reference commit; no public runtime or adapter release |
| ReviewRouter main | [`521b8956b8d415bc66c292a5216c658289ff14b9`](https://github.com/777genius/review-router-ai/commit/521b8956b8d415bc66c292a5216c658289ff14b9) | #1003 merged; review observation retry/idempotency and absolute publication-deadline handling |
| ReviewRouter #1007 | [`ada687c041128d9ff24ffd45865a82e348c69bd3`](https://github.com/777genius/review-router-ai/pull/1007) | Still open; integrates main and adds narrow dashboard/fixture/migration-checkout admission fixes |

### Governance applicability

The [central delta](https://github.com/agent-teams-ai/.github/compare/755c8515a5d106402a7e9e2cff621fb1fdc855cf...7ad5abbf5a8dade79f91f3e6f06481070b966a9e)
does not change the repository admission checker's Stack recognition, the
coverage-v5 incompatibility, the managed Docs cohort registry or FMS contracts.
The bootstrap admission gaps therefore remain applicable.

[Central #423](https://github.com/agent-teams-ai/.github/pull/423) is now merged,
rather than an open proposal. The current
[commit-author identity policy](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/governance/commit-author-identity.json)
names six repositories for its scoped owner-PR exception. `agent-teams-ai/identity`
is absent, and the default ruleset's bypass list remains empty. A merged policy
and [#428's caller/install record](https://github.com/agent-teams-ai/.github/pull/428)
do not establish new permission or installed enforcement for Identity.
BOOTSTRAP's earlier open-proposal wording is corrected accordingly.

### Module and consumer deltas

The [LMU delta](https://github.com/agent-teams-ai/live-module-updates/compare/dd8de63651e79e4737e1a0e412d2c74e79e0b646...b5b54d7958022ecc4e631e538bd2eb2fe707a8af)
adds construction cancellation/custody handling, complete-composition smoke
coverage and related reference documentation. Both the
[artifact manifest](https://github.com/agent-teams-ai/live-module-updates/blob/b5b54d7958022ecc4e631e538bd2eb2fe707a8af/tests/qualification/portable-document/artifact/package.json)
and [adapter manifest](https://github.com/agent-teams-ai/live-module-updates/blob/b5b54d7958022ecc4e631e538bd2eb2fe707a8af/tests/qualification/portable-document/adapter/package.json)
still describe private `@fixture/*` packages at `0.0.0`. Their tests were read as
source evidence, not re-executed or adopted as Identity qualification.

The [ReviewRouter main delta](https://github.com/777genius/review-router-ai/compare/1912bb61b54de8af113e0dccd5d4a144382e19e2...521b8956b8d415bc66c292a5216c658289ff14b9)
does not change login, user linking or SCM credential custody. The
[#1007 delta](https://github.com/777genius/review-router-ai/compare/237c802358396414859366520cbb58fb07450004...ada687c041128d9ff24ffd45865a82e348c69bd3)
adds the main merge, a signed-out dashboard redirect before workspace 404, the
existing `inventoryGeneration` auth fixture field, and exact name/checksum
admission for migration tails already present in that proposal. The migration
SQL and credential revision/refresh/revocation design are unchanged. Reusing
that work remains conditional on #1007's own acceptance; it is not yet merged.

### Final package observations and plan effect

The module reviewer directly re-read npm `latest` for Core/Assembly 0.8.0,
Resources 0.2.2, Conformance 0.5.2, Observation 0.2.1 and Effect 0.1.1 during
this final refresh. A direct registry read at 02:19:15 UTC also confirmed
[Stack 0.3.1](https://registry.npmjs.org/stack-toolchain/latest),
[Foundation 4.0.0](https://registry.npmjs.org/@agent-teams%2fengineering-foundation/latest)
and [FMS 0.4.1](https://registry.npmjs.org/@agent-teams%2ffeature-module-standard/latest).
The Foundation reviewer's earlier failed web-tool reads are not counted as
successful registry evidence; the later successful direct reads provide it.

No new public EF/LMU contract or compatible managed Docs cohort was established.
The architecture, inward dependency rule, account/session contracts, product
credential ownership and implementation phases remain unchanged. This refresh
updates provenance and governance wording only; it does not qualify a runtime,
deploy a service, change protections or merge either planning PR.

## Deep-review source refresh

Observed on 2026-11-26 at 15:16–15:23 Europe/Kyiv (13:16–13:23 UTC).
This observation supersedes earlier package-availability and Foundation-head
statements for the new planning review. The dated evidence above remains intact;
no prior consumer qualification is inferred for a new package version.

Engineering Foundation main is now
[`da1868240b96113582b508b0c15341c477d6334b`](https://github.com/agent-teams-ai/engineering-foundation/commit/da1868240b96113582b508b0c15341c477d6334b).
The [delta from `fac0392`](https://github.com/agent-teams-ai/engineering-foundation/compare/fac03920e50ebde038ae415edeb7aa9e3d610ada...da1868240b96113582b508b0c15341c477d6334b)
contains [#477's managed Node 26 pin preservation](https://github.com/agent-teams-ai/engineering-foundation/pull/477)
through the retained-generation upgrade, the initial
[#478 version wave](https://github.com/agent-teams-ai/engineering-foundation/pull/478),
and [#479](https://github.com/agent-teams-ai/engineering-foundation/pull/479)/[#480](https://github.com/agent-teams-ai/engineering-foundation/pull/480)'s
coordinated forward publication recovery. The initial wave was incomplete.
Current main [CI](https://github.com/agent-teams-ai/engineering-foundation/actions/runs/45816094797)
and [Release](https://github.com/agent-teams-ai/engineering-foundation/actions/runs/45816094753)
were observed with completed `success` conclusions; no fresh consumer execution
or signature/provenance verification is claimed.

Direct registry reads at 13:17:49 UTC observed Foundation **4.0.2**, FMS **0.4.3**,
Document Authoring **0.3.9**, Repository Mutation **0.5.2**, Docs Protocol **0.6.9**,
Docs Agent Teams **0.7.1** and Docs MCP **0.2.12**. Stack **0.3.1**, CI Input Proof
**0.1.3** and Release Checks **0.1.0** were unchanged. Exact registry links and
adoption limits are maintained in [BOOTSTRAP](../../BOOTSTRAP.md#2-exact-observed-availability-and-its-limits).
Archive inspection completed at 13:22:57 UTC for Foundation 4.0.2, FMS 0.4.3 and
Stack 0.3.1; their SHA-512 values matched registry `dist.integrity`. The artifacts
retain root configuration v3 with all 14 declared capabilities, strict quality
coverage v5, format coverage v1, FMS's public `./quality-topology` export and
Stack's literal-format marker. These observations establish the inspected files
and exports, not an installed or qualified Identity development graph.

Central main remains
[`7ad5abbf5a8dade79f91f3e6f06481070b966a9e`](https://github.com/agent-teams-ai/.github/commit/7ad5abbf5a8dade79f91f3e6f06481070b966a9e).
Its [checker](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/scripts/check-repository-admission.ts)
still recognizes exact Stack 0.1.1 and the obsolete `featureProfilePath` and
`compilerProjects` fields. The [cohort registry](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/governance/docs-qualified-cohorts.json)
still recommends only `docs-2026-10-03-stable31`. Both bootstrap prerequisites
remain real; newer publication neither resolves them nor creates an exemption.
The existing author-policy scope and empty default bypass list are unchanged.

Get Modular remains at `a5f41853200aed26d692e89d768185013d629a12`, Extension
Foundation at `312782a7a74515682a324dc0d89f43394ea1618d` and LMU at
`b5b54d7958022ecc4e631e538bd2eb2fe707a8af`. Core/Assembly **0.8.0**, Resources
**0.2.2**, Conformance **0.5.2**, Observation **0.2.1** and Effect **0.1.1** remain
the observed public versions. The lifecycle-kernel latest endpoint still returns
HTTP 404. The [current CMS document](https://github.com/agent-teams-ai/get-modular/blob/a5f41853200aed26d692e89d768185013d629a12/docs/architecture/common-assembly.md)
has unchanged whole-document SHA-256
`ef5044eef1da7a01f3ca40323cd17d9f2597fc22b5abb905c7c77e5318b408d7`.
EF's catalog remains empty and LMU's inspected manifests remain private
fixtures, as linked in the earlier refresh. P7 still requires actual public
contracts and consumer qualification; these updates authorize no fixture import,
runtime implementation or protection change.

## ReviewRouter and authentication-source refresh for the deep review

At 13:15–13:35 UTC (15:15–15:35 Europe/Kyiv), ReviewRouter main was
[`f20a75edbc7eff11be4f2423fb2e723f6e484223`](https://github.com/777genius/review-router-ai/tree/f20a75edbc7eff11be4f2423fb2e723f6e484223).
#998 and #959 are merged. The [delta from the prior delivered source snapshot](https://github.com/777genius/review-router-ai/compare/521b8956b8d415bc66c292a5216c658289ff14b9...f20a75edbc7eff11be4f2423fb2e723f6e484223)
has 283 changed paths, with no change in `apps/web/src/auth` or
`packages/features/auth/src`. This is a targeted source-delta review, not
qualification of every changed runtime path.

The current [root manifest](https://github.com/777genius/review-router-ai/blob/f20a75edbc7eff11be4f2423fb2e723f6e484223/package.json)
and [web manifest](https://github.com/777genius/review-router-ai/blob/f20a75edbc7eff11be4f2423fb2e723f6e484223/apps/web/package.json)
use exact Prisma/client/PG adapter 7.9.0. NextAuth 4.24.15, Next.js 16.4.6,
TypeScript 7.0.2, RR Foundation 3.1.0, Stack 0.3.1 and GM 0.8.0 remain.
New real `check:changed`, `check:fast` and `check` routes and the current
[AGENTS new-feature rules](https://github.com/777genius/review-router-ai/blob/f20a75edbc7eff11be4f2423fb2e723f6e484223/AGENTS.md)
are implementation inputs. ReviewRouter's already qualified adoption is not
silently replaced with Identity's newer Foundation tuple.

[#1007](https://github.com/777genius/review-router-ai/pull/1007) remains open at
`223402e3edb8c91746dc6659a6e8242d9b45eb59`; its latest GitLab SSR hydration and
cache-fixture changes do not make candidate custody/SQL migration merged-main
behavior. The new model-provider `nativeConnection` field in main is unrelated
to social identity/SCM ownership.

The security review also inspected pinned Keycloak 26.8.2
[authentication-time handling](https://github.com/keycloak/keycloak/blob/26.8.2/services/src/main/java/org/keycloak/services/managers/AuthenticationManager.java),
[OIDC broker age forwarding](https://github.com/keycloak/keycloak/blob/26.8.2/services/src/main/java/org/keycloak/broker/oidc/OIDCIdentityProvider.java),
and [GitHub profile lookup](https://github.com/keycloak/keycloak/blob/26.8.2/services/src/main/java/org/keycloak/social/github/GitHubIdentityProvider.java),
alongside [GitHub's authorization parameters](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app).
A new broker/OAuth flow is evidence of session control, not automatically
recent factor use. Both plans now distinguish those proof classes and the
ordinary-migration versus compromise-recovery policies. This source observation
does not qualify a future provider registration, deployed flow or native account.

Other sampled source heads remain: Platform
`76fc9734f6128b78c7a8b1bc858859fb1cbe835a`, Orchestrator
`b622026a082a0cccc5ec44eebf12d3f88eef6359`, the actual
`777genius/get-tok` fork `287d1751564de571a35ec847634a62cb47dd21d7`,
and Discord Meeting Assistant `8fb3d273f4d51eb149e9c310b7edefbee1c72052`.
Their original source audit remains the detailed evidence.
