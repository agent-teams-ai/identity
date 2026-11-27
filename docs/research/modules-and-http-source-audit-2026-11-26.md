# Source audit: modular contracts and the HTTP boundary

Status: research input for the Identity implementation plan. Observed on
2026-11-26 (Europe/Kiev), approximately 2026-11-25 23:52 UTC. Source inspection
and npm metadata retrieval were performed; Identity runtime tests were not.
This record proposes adoption choices without accepting upstream drafts or
claiming production qualification.

## Exact source baseline

| Repository | Inspected main | Relevant open PR at observation |
| --- | --- | --- |
| `777genius/discord-meeting-assistant` | `8fb3d273f4d51eb149e9c310b7edefbee1c72052` | None returned |
| `agent-teams-ai/get-modular` | `ae2418b186119c3c84736a6217a9ef25bbfe86cb` | [#256](https://github.com/agent-teams-ai/get-modular/pull/256), Draft, `fb96b5cb588896dc91264da6882c9b480c97ee35` |
| `agent-teams-ai/extension-foundation` | `65e03edd10cc08194cc4031f857aae302d4b9020` | [#68](https://github.com/agent-teams-ai/extension-foundation/pull/68), Draft, `1be01541ef454b6bacfd92de23fa0a5150bea7a9` |
| `agent-teams-ai/live-module-updates` | `6e0d5a9e61d76ff7eba7561aea89aa729ce32086` | [#4](https://github.com/agent-teams-ai/live-module-updates/pull/4), Draft, `7bb9aa85ef8d2867534ba59269d75e72606043c6` |

The [current Get Modular Consumer Module Standard](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/docs/architecture/common-assembly.md#consumer-module-standard)
has whole-file Git blob `12ccc2fa8a6f267d1008bc6fec64a055923d7f78` and SHA-256
`ef5044eef1da7a01f3ca40323cd17d9f2597fc22b5abb905c7c77e5318b408d7`.
These are inspected source identities, not an accepted Identity adoption.
Refresh upstream main, relevant PR heads and registry metadata before the first
implementation and record any reviewed delta in the local adoption profile.

## What the Discord HTTP abstraction actually provides

Its [accepted ADR-0012](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/docs/decisions/0012-meeting-platform-boundary-refactoring.md)
places Fastify in the outer transport adapter. Replacing HTTP or adding gRPC
reuses application inputs through another inbound adapter. It explicitly
rejects a generic in-house HTTP framework and service locator.

| Source | Observed boundary | Identity implication |
| --- | --- | --- |
| [platform-http-host.ts](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/apps/meeting-platform/src/http/platform-http-host.ts) | `PlatformHttpHost` contains only `start` and `close` | A small host lifecycle contract is sufficient where it is needed; there is no universal request/router abstraction to import |
| [fastify-platform-http-host.ts](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/apps/meeting-platform/src/http/fastify-platform-http-host.ts) | Concrete server, route plugins, safe error translation, socket tracking and bounded close; test injection and raw Node server are concrete APIs | Keep transport security, server handles and physical shutdown in the outer adapter |
| [composition/http.ts](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/apps/meeting-platform/src/composition/http.ts) | Composition imports the concrete host and attaches websocket transport to its raw server | Concrete framework types at the composition edge are intentional; the whole transport implementation is not framework-neutral |
| [operations-routes.ts](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/apps/meeting-platform/src/operations-http/operations-routes.ts) | Fastify route plugins call narrow health/deletion ports | Focused inbound adapters translate requests into use-case inputs instead of exposing `FastifyRequest` to application code |
| [dependency-rules.md](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/docs/architecture/dependency-rules.md) | Application depends on its domain and consumer-owned ports; wire DTOs, application models and domain events are separate | Preserve the direction and enforce it through current Foundation source/declaration checks |
| [shutdown test](https://github.com/777genius/discord-meeting-assistant/blob/8fb3d273f4d51eb149e9c310b7edefbee1c72052/apps/meeting-platform/test/fastify-platform-http-shutdown.test.ts) | A real TCP client never completes its request body; close must stop the listener | One adversarial real-transport check complements HTTP injection tests |

**Recommendation:** reuse the ownership pattern, without importing this
application or extracting a speculative HTTP library. Identity's Fastify
adapter validates transport inputs, invokes typed application commands/queries
and maps owned errors into HTTP responses. Keycloak, PostgreSQL, clocks and
identifier generation implement outbound ports. Domain/application contracts
expose ordinary semantic values and function-typed properties, with no Fastify,
Node server, ORM, provider SDK or Get Modular types. Current CMS requires
function-typed port properties; do not copy the older method syntax blindly.

Readiness must reflect actual adapter initialization and dependencies required
by the served operation. Successful composition, a listening socket or an
aborted signal does not establish service readiness or completed cleanup. Close
ingress, settle admitted work and then close owned resources. Caller deadlines,
cleanup debt and unresolved work remain distinct facts.

The Discord repository still pins Foundation 0.6.0 and records workarounds for
that release. Its local source-policy workarounds, Craig bearer authentication,
300-second request timeout, `.js` source import conventions and singleton
recording ownership are not Identity defaults. Use the current organization
toolchain and Identity's own threat and operational model.

## Public packages and imports available now

Direct registry `latest` metadata and the [current consumer quickstart](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/docs/guides/consumer-quickstart.md)
agree on this observed cohort. Registry discovery is not an installed-artifact
execution or a consumer migration.

| Package | Observed published version | Appropriate use |
| --- | --- | --- |
| `@get-modular/core` | 0.8.0 | Composition semantics and `required`/`optional`/`many`; `compileComposition` only for an actually externalized profile |
| `@get-modular/assembly` | 0.8.0 | One production root using `defineContract`, `declareModule`, `implement`, `group`, `assemblyFor`, `prepare` and `prepared.run` |
| `@get-modular/resources` | 0.2.2 | `createScope` and `scoped` for owned cooperative infrastructure cleanup |
| `@get-modular/conformance` | 0.5.2 | Development-only module/root wiring and contract checks |
| `@get-modular/observation` | 0.2.1 | Optional derived latest-state observation when a concrete need exists; never durable revocation/event history |
| `@get-modular/effect` | 0.1.1 | Optional explicitly adopted native Effect profile; its exact qualified Effect peer is 4.1.4 |

Assembly depends on Core exact 0.8.0. Conformance peers are Core `^0.8.0`,
Assembly `^0.8.0` and Resources `^0.2.2`; Observation peers with Resources
`^0.2.2`. Package engine compatibility is
`>=24.18.0 <25 || >=26.10.0 <27`; Identity still selects the current compatible
organizational toolchain rather than using these minimum ranges as exact pins.
GM's own newer Bun development profile does not automatically select Bun for
an independent consumer.

Exact exported names were inspected in [Core](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/packages/core/src/index.ts),
[Assembly](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/packages/assembly/src/index.ts)
and [Resources](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/packages/resources/src/index.ts).
Production consumers import package roots, never those source paths.
Registry endpoints used were, for example,
[Core latest metadata](https://registry.npmjs.org/@get-modular%2fcore/latest) and
[Conformance latest metadata](https://registry.npmjs.org/@get-modular%2fconformance/latest).
Commit a reviewed exact cohort and frozen lock; inspect real duplicate runtime
identities and packed declarations before claiming qualification.

## What the in-progress library work does and does not supply

| Work | Concrete result in inspected source | Production consequence |
| --- | --- | --- |
| GM #256 | Connects authoring guides to a maintained reference; no package/API change | Useful navigation after delivery; not a new lifecycle contract |
| EF #68 | [TEST-only exact-revision matcher](https://github.com/agent-teams-ai/extension-foundation/blob/1be01541ef454b6bacfd92de23fa0a5150bea7a9/tests/qualification/contribution-compatibility.ts), owner-defined synchronous validators, explicit optional omissions, rejection before evaluation | `OwnerContract` and `matchContributions` are test-owned examples, not production exports; the main [package catalog](https://github.com/agent-teams-ai/extension-foundation/blob/65e03edd10cc08194cc4031f857aae302d4b9020/architecture/package-catalog.json) remains empty |
| LMU #4 | [Private authoring reference](https://github.com/agent-teams-ai/live-module-updates/blob/7bb9aa85ef8d2867534ba59269d75e72606043c6/docs/plans/module-authoring-implementation-plan.md): ordinary portable core, optional GM adapter, independent Node/Chromium Hosts, controlled drain/close/reconstruct | All new runtime source remains TEST-owned; no public LMU runtime, npm publication or full live replacement guarantee |
| GM lifecycle kernel | [Private 0.1.0 manifest](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/packages/lifecycle-kernel/package.json); registry latest returned 404 | No supported production import; static composition does not need it |

The [lifecycle candidate contract](https://github.com/agent-teams-ai/get-modular/blob/ae2418b186119c3c84736a6217a9ef25bbfe86cb/packages/lifecycle-kernel/README.md)
records synchronous bookkeeping, not asynchronous supervision, effect authority,
physical release or durable recovery. EF's [accepted ADR-0015](https://github.com/agent-teams-ai/extension-foundation/blob/65e03edd10cc08194cc4031f857aae302d4b9020/docs/decisions/0015-authorize-get-modular-semantic-extraction.md)
keeps GM/EF neutral cores independent and operational authority with the Host.
LMU's [application foundation guide](https://github.com/agent-teams-ai/live-module-updates/blob/6e0d5a9e61d76ff7eba7561aea89aa729ce32086/docs/architecture/application-foundation.md)
is explicitly proposed guidance, not a new API or admission authority.

**Recommendation:** import existing public GM descriptors/types at the real
composition boundary now. Keep Identity semantic value types inward. Track
EF/LMU deliveries and integrate their actual admitted public contracts through
outer adapters when available. Do not import test files/private packages,
copy generic coordinators, or publish placeholder interfaces pretending to be
the future EF/LMU protocol. Future integration can be localized by ownership;
zero changes cannot be guaranteed before those public contracts exist.

## Critical integration implications

- One canonical account/binding owner enforces proof, uniqueness and lifecycle
  transitions transactionally. Features are not automatically separate
  processes, database schemas or packages.
- Keep business account revision, session epoch, external-binding revision,
  provider subject, GM capability revision, implementation ID and runtime
  generation distinct. A composition or lifecycle lease is not account authority.
- All real alternative implementations use one explicit composition root.
  Private helpers remain ordinary functions. No service bag, second resolver,
  global mutable registry or direct production assembly fallback.
- GM descriptors live in outer composition; semantic contracts and
  consumer-owned ports remain ordinary TypeScript. Public transport DTOs and
  integration events do not become shared domain aggregates.
- Canonical account state and the durable outbox outlive module instances.
  Observation and SDK caches cannot become second account or revocation ledgers.
- Borrowed database/provider clients have one lifetime owner. Failed/late
  construction retains cleanup obligations. A callback's successful return
  does not prove all foreign work or sockets physically stopped.
- Controlled process rollout is the initial update boundary for sensitive
  identity/security behavior. A future finer live boundary needs an admitted
  profile, current authority at effects, migration compatibility and exact
  retirement/recovery evidence.
- Notification/audit-export extensions receive narrow data/effect capabilities,
  without signing keys, Keycloak administration credentials, direct account
  writes or an ambient secret bag. Extension failure cannot weaken proof rules.

The compact modularity acceptance is: actual public-root wiring rejection
before factory effects; one deliberate forbidden inward/deep import; partial
startup cleanup preserving borrowed owners; one held operation during drain;
and one real TCP incomplete-body shutdown. Use existing Foundation and
Conformance checks instead of building another parser or reproducing every
implementation detail in tests. Identity's real Keycloak/PostgreSQL critical
flows require separate end-to-end evidence in the implementation plan.

## Final freshness check — 2026-11-26 00:18 UTC

The initial source observations above are retained. A final [LMU #4](https://github.com/agent-teams-ai/live-module-updates/pull/4)
check found it still open and Draft, with main unchanged at
`6e0d5a9e61d76ff7eba7561aea89aa729ce32086` and its head advanced by three commits
to `1b1891679da90f13ab3e9ea2e57eb8b3e9627aa1`.
The [bounded comparison](https://github.com/agent-teams-ai/live-module-updates/compare/7bb9aa85ef8d2867534ba59269d75e72606043c6...1b1891679da90f13ab3e9ea2e57eb8b3e9627aa1)
adds feature-owned GM composition, packed consumer contract probes, Foundation/FMS
source checks, and independently implemented Node/Chromium Host lifecycle cases.
The source now includes held-work drain, retained cleanup debt, controlled
restart and failed-construction cases; this audit did not execute them.

Both the [core artifact](https://github.com/agent-teams-ai/live-module-updates/blob/1b1891679da90f13ab3e9ea2e57eb8b3e9627aa1/tests/qualification/portable-document/artifact/package.json)
and [optional GM adapter](https://github.com/agent-teams-ai/live-module-updates/blob/1b1891679da90f13ab3e9ea2e57eb8b3e9627aa1/tests/qualification/portable-document/adapter/package.json)
remain `@fixture/*`, version `0.0.0`, `private: true`. The invocation owner is
explicitly a finite TEST Host helper, without a public LMU routing/generation API.
This is a stronger executable reference candidate, not a new production dependency
or published EF/LMU contract. Identity's public-contract gates are unchanged.
The reference's older Foundation/FMS tool pins are fixture-owned; do not copy
them over Identity's current reviewed bootstrap cohort.
