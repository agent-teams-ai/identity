# Identity repository bootstrap plan

Status: first substantive implementation under qualification, 2026-11-26.
The owner authorized Identity implementation with GetTok as its first consumer.
Account, provider, persistence, versioned contract and HTTP sources now exist.
Central admission, managed Docs enrollment and production rollout remain
separate evidence; this document does not fabricate an accepted registration
row or a successful complete V1 release.

This document owns the repository's bootstrap sequence and applicability
decisions. The linked central documents remain the policy owners. It must be
reviewed alongside the Identity architecture and implementation plan before
changing source. A planning PR or a successful local gate is not a production
bootstrap pass.

## Current implementation record

The implementation adopts Foundation 4.0.2, Stack 0.3.1, FMS 0.4.3 and the
Get Modular packages recorded in the native workspace catalog. Node 26.11.1
and pnpm 11.20.0 are the exact consumer runtime pins. The published Foundation
engine requires pnpm below 12; a different product's package-manager pin does
not override this installed package contract. Stack remains the sole owner of
TypeScript 7.0.2, Oxlint 1.83.0, its typed companion and Oxfmt 0.74.0.

The two private library boundaries were created with the actual published
Foundation recipe, reviewed plans and successful applied receipts:

- [Account package receipt](architecture/scaffolding/identity-core.receipt.json)
- [Contract package receipt](architecture/scaffolding/identity-contracts.receipt.json)
- [Completed local metadata disposition](architecture/scaffolding/completed-local-metadata.json)

The disposition records exact digests and the public idle transaction preflight.
It does not claim that raw local recovery archives are available in CI. Required
plans and receipts stay in the repository. Completed local mutation metadata
is preserved outside the consumer census; pending transactions are never
removed to make a check pass.

[ADR-0001](docs/decisions/0001-identity-modules-and-tooling.md) accepts full FMS
v1.1 and the separate Get Modular CMS. The [single profile](architecture/foundation/feature-modules.json)
maps real source; its gate checks the actual parsed graph. The neutral quality
topology is a digest-bound public projection with explicit native Protobuf/SQL
assets. Native Go generation and tests have their own check; Foundation's TS
coverage does not claim to type-check Go.

[ADR-0002](docs/decisions/0002-native-postgres-first-slice.md) records the native
pg adapter for this slice after the observed Drizzle strict-compiler failure.
The semantic AccountStore port is unchanged. No compiler downgrade, hidden
library error or temporary ORM fork is used.

Native package and test compilation, the actual FMS/CMS graph, the full source
coverage scope and typed lint have run successfully during development. The
focused tests and native provider/service fixtures have also produced local
passes. These observations are bounded to their executed source revisions;
the final aggregate and hosted same-head checks still govern qualification.

The latest checked owner heads remain central
[89b5d7c](https://github.com/agent-teams-ai/.github/commit/89b5d7c512d9c4b5ae63709857a0d71cb2e6d178)
and Foundation
[8432a97](https://github.com/agent-teams-ai/engineering-foundation/commit/8432a9737486384f894436bfd9242500e422fa5a).
The central caller still executes its legacy Stack 0.1.1 / coverage adapter.
Its narrow successor belongs in a separate owning PR, preserving the legacy
profile and all actual v5 protections. Do not add rejected legacy fields to
Identity's v5 profile. Docs stable33 remains QUALIFIED with Extension Foundation
as its canary; stable31 remains RECOMMENDED. Central
[#434](https://github.com/agent-teams-ai/.github/pull/434) is still a separate
managed-cohort adoption task. Identity has no fabricated managed Docs profile.

The sections below retain the original source audit and activation decisions.
Their dated observations are historical context; the current record above and
fresh owning-source review govern subsequent changes.

## 1. Read the current owners before changing pins

| Subject                                | Reviewed source                                                                                                                                                                    | Maintained navigation                                                                                                      |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| New repository policy                  | [Repository admission at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/repository-admission.md#new-repository-bootstrap) | [Current guide](https://github.com/agent-teams-ai/.github/blob/main/docs/repository-admission.md#new-repository-bootstrap) |
| Common engineering practices           | [Quality standard at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/engineering-quality-standard.md)                      | [Current standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md)               |
| Shared ownership and library direction | [Ecosystem vision at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/architecture/ecosystem-vision.md)                     | [Current vision](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/ecosystem-vision.md)                |
| Runtime technology responsibilities    | [Backend stack at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/backend-stack.md)                                        | [Current stack](https://github.com/agent-teams-ai/.github/blob/main/docs/backend-stack.md)                                 |
| Tool discovery                         | [Development catalog at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/development-tools.md)                              | [Current catalog](https://github.com/agent-teams-ai/.github/blob/main/docs/development-tools.md)                           |
| Foundation adoption                    | [Consumer adoption at `da18682`](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/docs/development/consumer-adoption.md)     | [Current guide](https://github.com/agent-teams-ai/engineering-foundation/blob/main/docs/development/consumer-adoption.md)  |

Read current changes for freshness; adopt exact reviewed revisions for durable
contracts. A newer navigation target cannot silently change an accepted
standard, release baseline or consumer pin. The table reflects the deep review
on 2026-11-26 at 15:16–15:23 Europe/Kyiv (13:16–13:23 UTC). The
[source freshness record](docs/research/modules-source-freshness-2026-11-26.md)
preserves the earlier dated snapshots and records the Foundation release delta;
that planning audit used central `7ad5abb`. The current implementation record
above identifies the later checked owner heads.

## 2. Exact observed availability and its limits

Public npm metadata was read on 2026-11-26 at 13:17:49 UTC. Archive inspection
completed at 13:22:57 UTC for Foundation 4.0.2, Stack 0.3.1 and FMS 0.4.3;
each tarball's SHA-512 matched its registry `dist.integrity`.
This establishes artifact availability and the named packaged files/exports.
It is not a fresh consumer install, signature/provenance verification, full
package qualification or a production-admission result.

| Development package                      | Exact release observed                                                             | Relevant packaged contract                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `@agent-teams/engineering-foundation`    | [4.0.2](https://registry.npmjs.org/@agent-teams%2fengineering-foundation/4.0.2)    | Quality coverage v5, format coverage v1 and root configuration schema v3; development only |
| `stack-toolchain`                        | [0.3.1](https://registry.npmjs.org/stack-toolchain/0.3.1)                          | Technical presets, installed tool manifest and literal-format contract marker              |
| `@agent-teams/feature-module-standard`   | [0.4.3](https://registry.npmjs.org/@agent-teams%2ffeature-module-standard/0.4.3)   | FMS checks and public `./quality-topology` projection                                      |
| `@agent-teams/document-authoring`        | [0.3.9](https://registry.npmjs.org/@agent-teams%2fdocument-authoring/0.3.9)        | Portable document authoring; metadata observation only                                     |
| `@agent-teams/repository-mutation`       | [0.5.2](https://registry.npmjs.org/@agent-teams%2frepository-mutation/0.5.2)       | Shared mutation/recovery owner; metadata observation only                                  |
| `@agent-teams/docs-protocol`             | [0.6.9](https://registry.npmjs.org/@agent-teams%2fdocs-protocol/0.6.9)             | Portable Docs package; metadata observation only                                           |
| `@agent-teams/docs-protocol-agent-teams` | [0.7.1](https://registry.npmjs.org/@agent-teams%2fdocs-protocol-agent-teams/0.7.1) | Organization-managed integration; publication alone does not admit a cohort                |
| `@agent-teams/docs-protocol-mcp`         | [0.2.12](https://registry.npmjs.org/@agent-teams%2fdocs-protocol-mcp/0.2.12)       | Optional admitted authoring transport; metadata observation only                           |
| `@agent-teams/ci-input-proof`            | [0.1.3](https://registry.npmjs.org/@agent-teams%2fci-input-proof/0.1.3)            | Pure development/CI inventory comparison; metadata observation only                        |
| `@agent-teams/release-checks`            | [0.1.0](https://registry.npmjs.org/@agent-teams%2frelease-checks/0.1.0)            | Pure release-candidate comparison; metadata observation only                               |

The inspected Stack manifest owns TypeScript 7.0.2, Oxlint 1.83.0,
oxlint-tsgolint 7.0.2001, Oxfmt 0.74.0, optional Bun 1.4.3 and optional tsrs
0.18.0-ts7.1.0-dev.20260929. Consume that versioned tool set and public presets;
do not maintain a second independent list in Identity scripts.

Central's observed tooling runtime is Node 26.11.1, with a separate complete
Node 24.21.0 compatibility lane and pnpm 11.18.0. The Engineering producer
uses Bun 1.4.3 and a Node/pnpm projection whose catalog pins pnpm 11.20.0.
These are repository-owned profiles. Identity selected its exact native profile
above and must qualify it; it does not inherit a manager
merely by installing Stack. New maintained JavaScript-runtime source, tooling
and tests use `.ts`, covered by strict TypeScript 7.0.2 or newer.

The backend reference intentionally leaves exact Fastify, Connect, Drizzle,
node-postgres, PostgreSQL, Keycloak and container pins to the adopting service.
Record their exact qualified versions/digests in the actual manifest, native
lock, deployment data and local adoption record. Do not substitute moving
`latest` tags or claim there is a central runtime dependency lock to inherit.

## 3. Observed admission gaps to reconcile

### 3.1 New-repository checker versus current quality tooling

The planning audit's
[central checker](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/scripts/check-repository-admission.ts)
recognizes Stack presets only for the exact root development pin **0.1.1**.
It reads `featureProfilePath` and `compilerProjects` from the coverage profile.
The current
[Foundation 4 migration](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/docs/development/quality-v5-migration.md)
executes v5 only: `topologyPath` replaces the FMS-specific path, and
`toolchainConfigPath` points to the sole compiler-project authority,
`typecheck.projects`. Its strict schema rejects obsolete extra fields.

The producer and central owners must qualify a narrow supported checker
successor for the selected released graph before claiming production admission.
Preserve strictness, unknown-source rejection, real gate reachability and the
existing protected-source publication route. Do not add old fields to v5,
downgrade the tools, copy removed presets or weaken checks in Identity.

This prerequisite affects the production bootstrap claim. It does not prevent
substantive source development and honest native qualification in the owning
Draft PR while the central adapter follows its normal review route.

### 3.2 Managed Docs versus independently published packages

At the reviewed central source, the only current `RECOMMENDED` entry in the
[cohort registry](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/governance/docs-qualified-cohorts.json)
is `docs-2026-10-03-stable31`. Its tuple includes Foundation 1.7.2, Docs
Protocol 0.6.2, Docs Agent Teams 0.3.2, Document Authoring 0.3.2 and Repository
Mutation 0.2.2. This differs from the current public releases above.

[Central #425](https://github.com/agent-teams-ai/.github/pull/425) records newer
preparation and a source-admission prerequisite. It does not activate stable32
or enroll Identity. Follow the
[registration guidance](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/docs/repository-registration.md):
retain pending managed admission until an eligible coherent graph is qualified.
Do not select independent npm tags as a managed cohort, downgrade current
quality tooling to fit an older cohort, or invent an exemption.

This repository has no existing managed authoring profile. The present
reviewable Markdown checkpoint does not claim managed adoption. Once the
applicable route exists, bootstrap its actual profile and authoring commands
through their reviewed Plan/Apply/Receipt workflow; preserve transaction and
recovery evidence instead of hand-editing it.

### 3.3 Stale navigation text is not an artifact contract

The central development catalog is dated 2026-10-25 and describes Stack 0.1.1.
The producer's format-coverage reference still labels the feature unpublished,
but the inspected public Foundation 4.0.2 archive contains
`quality-format-coverage/v1` and root schema v3; public Stack 0.3.1 exposes the
literal-format marker. Therefore verify the exact public API, executable
behavior and applicable consumer evidence before activation. Do not infer
either working full coverage or absence of the contract from stale prose alone.

Refresh those navigation records through their owners when the selected
bootstrap is implemented. Do not rewrite immutable historical proof.

## 4. Full Foundation applicability from the beginning

Every relevant mechanism has an activation point below. The original planning audit
recorded activation points; the current implementation record distinguishes
installed subjects from completed qualification. “Documentation
bootstrap” means the first actual development-tool setup, which can precede
production source. Conditional rows acquire obligations when their real
subject exists; they are not permission to omit applicable protections.

| Capability or mechanism                                 | Activation point                                                                  | Identity-owned input and proof                                                                                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Registry and development-only assertions                | First tooling installation                                                        | Exact root dev pins, native frozen lock and contained installed tools; no production imports or committed links                                                                                 |
| `documentation.local-references`                        | Documentation bootstrap                                                           | Actual Markdown roots, reachable indexes and GitHub anchors                                                                                                                                     |
| `repository.agent-workflow`                             | Documentation/tooling bootstrap                                                   | Canonical AGENTS, thin supported-agent pointers and real changed/fast/full commands                                                                                                             |
| `governance.architecture-decisions`                     | First ADR lifecycle                                                               | Proposed/accepted separation, owned index and immutable accepted baselines                                                                                                                      |
| `workspace.dependency-declarations`                     | First manifests/workspace                                                         | One native dependency authority, exact external pins, workspace protocols and approved development-only set                                                                                     |
| FMS v1.1 through its dedicated package                  | First substantive production modules                                              | One explicit reachable profile mapping real roles/features/layers and deterministic positive/negative gates                                                                                     |
| `architecture.source-dependencies`                      | First production source                                                           | Actual owners and allowed edges; reject domain/application imports of Fastify, generated transport, Drizzle or provider SDKs                                                                    |
| `quality.source-coverage` v5                            | First production source                                                           | Neutral topology, sole compiler-project authority, complete production census and real typed lint/strict compilation                                                                            |
| `quality.suppression-governance`                        | First governed source                                                             | Protected rules and initially empty waiver set; justified finite owned waivers only                                                                                                             |
| Stack check/lint/format/compile/doctor                  | First relevant tooling/source                                                     | Public installed presets and manifest; explicit source scopes, no duplicated compiler/linter runner                                                                                             |
| `quality.gate-runner`                                   | First real multi-script workflow                                                  | Existing scripts, bounded concurrency/deadlines and required full route; static configuration is not execution                                                                                  |
| `repository.security-baseline`                          | Applicable release/publishing bootstrap                                           | Actual workflow permissions, immutable actions and package/SBOM/provenance evidence for any released SDK                                                                                        |
| `contract.protobuf-evolution`                           | First versioned public RPC contract                                               | Real Buf descriptor/build/breaking evidence; no Protobuf requirement for local function calls                                                                                                   |
| `contract.json-schema-releases`                         | First supported schema family                                                     | Actual boundary schemas, positive/negative corpus and independent supported-consumer evidence                                                                                                   |
| `package.public-api-compatibility`                      | First public TypeScript SDK/package                                               | Curated surface and release-owned baselines; no invented public contract for private implementation                                                                                             |
| Release Checks                                          | First supported SDK/package release workflow                                      | Exact installed public checker, independent candidate observations and shared conformance cases; Changesets remains the version/dependency engine                                               |
| `quality.executable-specifications`                     | First critical independently specified contract                                   | Real identity/binding/revocation invariant and executable gate; reuse focused fixtures, not a new generic modeling engine                                                                       |
| `quality.format-coverage`                               | First actual tooling/source setup, with exact-contract and consumer qualification | Complete maintained-input census, literal Stack execution and real retained/generated/native validators; bad-input and no-op-substitution rejection for every authority                         |
| Deterministic scaffolding                               | Materialization of an eligible real package boundary                              | Qualified released recipe, owned target, saved reviewed Plan, digest-bound create-only apply, receipt and exact-build recovery; no assumed product/DDD recipe                                   |
| Document Authoring / managed Docs                       | Eligible coherent admission route                                                 | Owned profile/templates/relations, exact package cohort, genuine integration and hosted evidence                                                                                                |
| CI Input Proof                                          | Only when adopting a justified affected-check or evidence-reuse policy            | Complete independently collected input closure and authenticated prior results; inventory compatibility cannot grant a PASS or permission to skip; independent FULL fallback remains executable |
| `quality.findings-baseline`                             | Only after a real approved debt/admission need                                    | No manufactured greenfield debt; current capability catalog does not mark this mechanism released or declarable in root config                                                                  |
| Optional MCP, mechanical cleanup and future diagnostics | Concrete justified developer need                                                 | Explicit supported public release/profile; no automatic source writes or runtime dependency                                                                                                     |

Release Checks and CI Input Proof are public development-only leaf libraries,
not extra Identity modules or authorities to publish, merge or omit a check.
Use their [release contract](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/packages/release-checks/README.md)
and [CI comparison contract](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/packages/ci-input-proof/README.md)
at the real seam if the corresponding workflow exists. The incubated Agent
Architecture Standard is not applicable merely because the organization builds
agent products; reassess only if Identity itself acquires an agent architecture.

The schema-specific topology projection is the public
`@agent-teams/feature-module-standard/quality-topology` API. Use it from owned
strict tooling and preserve its `derivedFrom` digest bindings when committing
generated topology. Keep the separate FMS semantic gate; a fresh projection is
not proof that the architecture conforms.

During the first tooling/source setup, qualify the complete
[format-coverage route](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/docs/reference/quality-format-coverage.md)
against the actual maintained inputs and required gate. If a safe native,
support-file, lock or generated-output validator is missing, record that
specific authority and its owned next action as an open bootstrap prerequisite.
A narrow Stack format command does not establish complete coverage; the full
check must not invoke generators or substitute a no-op validator to pass.

The released generic Node TypeScript library
[scaffolding recipe](https://github.com/agent-teams-ai/engineering-foundation/blob/da1868240b96113582b508b0c15341c477d6334b/docs/development/consumer-adoption.md#deterministic-scaffolding)
creates a package boundary only. Author Identity's features, use cases,
composition and FMS/CMS facts through ordinary reviewed source changes unless
an actual qualified released recipe covers that exact work. Do not make an
invented Identity architecture generator a prerequisite.

## 5. Implementation sequence and evidence

1. **Resolve the owning bootstrap inputs.** Re-read current releases and relevant
   PRs. Select exact compatible development/runtime pins; confirm package
   exports, dependency closure and compiler/parser versions. Reconcile the
   central v5/Stack adapter and managed Docs route above without weakening them.
2. **Record local adoption.** Name the repository owner and actual first
   vertical slice. Adopt the applicable backend subset and full immutable FMS
   v1.1 through an owned ADR/profile. Use standard ID
   `agent-teams.feature-module-standard`, canonical version path and SHA-256
   `cfa088ef7396139554fe5e3bcc839271b23299c6b60c569a3a7f1cd7c9f0bc6c`
   from the [immutable registry](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/governance/feature-module-standard.json).
   Bind a reviewed nonzero source revision; the npm FMS package version is a
   different identity from standard version v1.1.
   Separately adopt the Get Modular Consumer Module Standard through an accepting
   ADR and owned profile, with exact source revision, whole-document SHA-256
   `ef5044eef1da7a01f3ca40323cd17d9f2597fc22b5abb905c7c77e5318b408d7`
   for the reviewed baseline and the actual Host/feature scope. Reconcile any
   subsequent document delta before pinning. Feature composition owns its
   descriptors/modules/groups; package composition wires public top-level
   groups. Restrict GM imports to composition/tests and align real FMS/CMS
   scope without inventing a second resolver or empty conformance targets.
3. **Bootstrap with substantive source.** Use Foundation Plan/Apply/Receipt only
   for real package boundaries covered by an eligible released recipe. Author
   the first account feature, composition and FMS/CMS facts as reviewed source;
   land ownership, essential tests and gates together. Do not reserve empty
   packages, fake compiler projects or no-op commands for future features.
4. **Wire all applicable checks.** Install consumer-owned capability data and
   exact dev dependencies. Keep `check` as the full native route; changed/fast
   feedback cannot replace full FMS, coverage, strict compilation, essential
   tests, Foundation, registry/dev-only and contract checks. Avoid duplicate
   full test runs when existing evidence covers the changed risk.
   Activate complete format coverage during this setup, with the actual
   authority qualification above; report any missing safe validator explicitly.
5. **Install immutable callers.** Render the current reviewed central admission
   caller and the separately accepted commit-identity caller. The initially
   inspected policy recognized implementation
   `77a0f46cbfc7688cbabbe12ee819e50ba6f64234`; resolve the current qualified caller
   and verify its authority before adoption. Central #423 is now merged policy,
   but its scoped owner-PR exception does not include Identity and does not
   establish installed remote enforcement.
6. **Qualify the actual consumer.** Execute a real permitted import and forbidden
   import, unknown production source, weakened protected rule and representative
   critical contract failure with the same installed artifacts/configuration.
   Reuse a small coherent fixture set; do not invent a large parallel test engine.
7. **Observe hosted gates and enforcement separately.** Retain same-revision
   native results, immutable workflow identities and the actual required-check
   observation. A first caller installation cannot protect its own initial PR.
   Queued, skipped, cancelled, absent and failing results cannot be called PASS.
8. **Complete central registration/admission.** Use the owner's normal route for
   each evidence axis. Source, installed package, runtime, Docs, executable
   contract and remote protection are separate claims. Report unresolved axes
   explicitly, with the next concrete owned action.

The bootstrap is complete when the first real implementation and its admitted
tooling pass the required same-source gates with actual enforcement observed.
The central static result `configured_not_qualified` alone is insufficient.

## 6. Upstream changes and adoption boundaries

- [Engineering #476](https://github.com/agent-teams-ai/engineering-foundation/pull/476)
  proposes optional Effect diagnostics and GM qualification. Observe its public
  release and consumer scope before using it; it does not require adopting
  Effect throughout Identity.
- [Engineering #468](https://github.com/agent-teams-ai/engineering-foundation/pull/468)
  proposes two opt-in Landmines rules. It does not prohibit legitimate port
  fakes or make a broad testing plugin mandatory.
- [Engineering #458](https://github.com/agent-teams-ai/engineering-foundation/pull/458)
  compares existing dependency updaters. It has not created a universal runtime
  dependency profile or automatic fleet upgrade service.
- [Central #423](https://github.com/agent-teams-ai/.github/pull/423) is merged.
  The [policy at `7ad5abb`](https://github.com/agent-teams-ai/.github/blob/7ad5abbf5a8dade79f91f3e6f06481070b966a9e/governance/commit-author-identity.json)
  permits a scoped owner-PR exception for six named repositories; Identity is
  absent, and the default ruleset has no bypass actors. This is policy evidence,
  not proof of installed protection. Preserve the applicable protections and
  the user's request to deliver this work as Draft PRs.

Tracked proposals and policy changes may inform sequencing. Only qualified public contracts and
explicit consumer adoption become actual dependencies.
