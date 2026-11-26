# Repository instructions

## Current scope

Identity is under implementation with GetTok as its first consumer. Read the
[implementation plan](docs/plans/identity-service-implementation-plan.md),
[bootstrap record](BOOTSTRAP.md), [module adoption](docs/architecture/module-adoption.md)
and [accepted decisions](docs/decisions/README.md). The first account, provider,
contract and HTTP slice is substantive source. Its presence is not evidence of
complete V1 delivery, production readiness or central admission.

Keep source observations, executed checks and accepted decisions distinct.
Publish useful checkpoints to the owning Draft PR before long local work.
Never describe a queued, skipped, absent or failing check as successful.

## Shared owners and boundaries

Before relevant changes, read the maintained organization owners and compare
them with the exact adoption revisions in BOOTSTRAP:

- [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md)
- [Ecosystem vision](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/ecosystem-vision.md)
- [New repository bootstrap](https://github.com/agent-teams-ai/.github/blob/main/docs/repository-admission.md#new-repository-bootstrap)
- [Backend stack](https://github.com/agent-teams-ai/.github/blob/main/docs/backend-stack.md)
- [Engineering Foundation adoption](https://github.com/agent-teams-ai/engineering-foundation/blob/main/docs/development/consumer-adoption.md)
- [Commit and PR authorship](https://github.com/agent-teams-ai/.github/blob/main/GOVERNANCE.md#commit-and-pull-request-authorship)

The [single FMS profile](architecture/foundation/feature-modules.json) maps actual
features and public surfaces. The architecture gate invokes published FMS and
Get Modular CMS on the parsed consumer graph. Feature composition publishes
groups; package composition assembles groups and Host entries. Domain,
application and semantic ports remain independent of HTTP, PostgreSQL,
Keycloak, generated transport models and modular frameworks.

GetTok owns its local users, sessions and product authorization. Identity owns
stable accounts, external bindings and lifecycle fences. Provider-session
control is ordinary authentication evidence; it cannot acquire independent
continuity or recovery authority merely through a claim label.

Use the public Foundation recipe for eligible real library boundaries. Preserve
the reviewed plans and applied receipts; subsequent ordinary source changes do
not rewrite that history. Create no empty SDK, adapter or module to imply adoption.

## Native tooling and checks

Use the exact runtime in .node-version, the packageManager pin and the frozen
pnpm lock. Foundation is development-only. Stack owns the compiler, linter and
formatter; use its public presets and commands. Do not add an independent
compiler, disable protected rules, skip library checking, hide new source roots
or add deprecated fields to satisfy an older central checker.

Run `pnpm install --frozen-lockfile --ignore-scripts`. Native contract checks also
require Go 1.27.3, protoc-gen-go 1.36.12 and protoc-gen-connect-go 1.21.1.
The required routes are:

| Command                           | Subject                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm build`                      | Clean owned artifacts, compile actual packages and tests with Stack, record complete build inputs and outputs |
| `pnpm typecheck`                  | Strict aggregate TypeScript program                                                                           |
| `pnpm lint:typed`                 | Actual literal source, test and tool roots; protected semantic and maintainability rules                      |
| `pnpm architecture:check`         | Actual FMS/CMS source graph and published conformance fixtures                                                |
| `pnpm check:static`               | Stack, registry/development-only, topology, architecture, coverage and configured Foundation capabilities     |
| `pnpm format:check`               | Complete physical formatting census and read-only native authorities after a real build                       |
| `pnpm format:qualify`             | Positive and independent rejecting controls for the native format authority and build input custody           |
| `pnpm contracts:check`            | Buf validation, isolated deterministic regeneration and native Go wire vectors                                |
| `pnpm specifications:mutation`    | Actual bounded account invariant properties and targeted production mutations                                 |
| `pnpm test`                       | Mandatory named Node tests, including real PostgreSQL and TCP transport                                       |
| `pnpm test:native-authentication` | Real pinned Keycloak and production Identity service with fresh disposable PostgreSQL databases               |
| `pnpm check`                      | Complete native route; every constituent must succeed                                                         |
| `pnpm check:fast`                 | Current complete route; no unqualified affected-test shortcut                                                 |
| `pnpm check:changed`              | Foundation's changed-work dispatcher; the selected repository scope reaches the complete route                |

Use `check:fast` after a coherent local change. Use `check:changed` for the
current diff before publication and `check` for the required full qualification.
A changed-work observation does not replace hosted full checks.
The separate hosted `native-authentication` job is also required; the ordinary
`check` route does not claim to execute that real provider qualification.

PostgreSQL tests require an actual disposable database named identity_test in
IDENTITY_TEST_DATABASE_URL. Missing prerequisites must fail, not skip. Provider
and service native fixtures require the real pinned Keycloak distribution,
its test realm, explicit database migration and disposable fixture credentials.
Do not run `build` while another task uses .test-build: cleaning it invalidates
that running execution.

Formatting does not run generators, contact providers or modify source. Exact
native-input hashes may be updated only after reviewing the owning producer's
actual result. Generated Protobuf output follows the documented native pipeline;
do not run generic source cleanup on it. For mechanical edits use explicit
owned files with public `stack-toolchain fix`, then run normal checks.

## Evidence and delivery

Keep the Foundation applicability table current when a real release, schema,
SDK or workflow creates a new obligation. A private package is not a released
SDK, and an initial candidate is not a released compatibility baseline.

Resolve central checker and managed Docs prerequisites through their owning
reviewed routes. Never rewrite accepted upstream evidence, alter remote
protection or invent an exemption to turn a consumer check green.

Publish authorized work using canonical author and committer identity, preserve
contributor attribution, and verify remote bytes and PR state. A request for a
Draft PR alone does not request merge or deployment.
