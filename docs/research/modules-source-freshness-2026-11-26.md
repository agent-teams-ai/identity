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
