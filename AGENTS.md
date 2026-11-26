# Repository instructions

## Current scope

This is a planning-stage repository for the expanded Identity service. Read the
[implementation plan](docs/plans/identity-service-implementation-plan.md) and
[bootstrap plan](BOOTSTRAP.md). Keep proposed decisions, source observations,
executed verification and accepted architecture distinct. Do not describe planned
runtime capabilities as implemented or create empty packages to imply adoption.

## Shared owners

Before relevant work, read the maintained organization owners and review changes
against the pinned source baseline recorded in BOOTSTRAP:

- [Engineering Quality Standard](https://github.com/agent-teams-ai/.github/blob/main/docs/engineering-quality-standard.md)
- [Ecosystem vision](https://github.com/agent-teams-ai/.github/blob/main/docs/architecture/ecosystem-vision.md)
- [New repository bootstrap](https://github.com/agent-teams-ai/.github/blob/main/docs/repository-admission.md#new-repository-bootstrap)
- [Backend stack](https://github.com/agent-teams-ai/.github/blob/main/docs/backend-stack.md)
- [Engineering Foundation consumer adoption](https://github.com/agent-teams-ai/engineering-foundation/blob/main/docs/development/consumer-adoption.md)
- [Commit and PR authorship](https://github.com/agent-teams-ai/.github/blob/main/GOVERNANCE.md#commit-and-pull-request-authorship)

Use current compatible public packages and exact pins/native locks. Stack owns
its compiler/linter/formatter versions. Foundation remains development-only.
Bootstrap records known central-checker/cohort inconsistencies and the owning
resolution route; never work around them by weakening checks or pretending an
unqualified package graph is admitted.

Adopt full FMS v1.1 and the separately reviewed Get Modular CMS with the first
substantive production modules. Use applicable Foundation scaffolding for eligible real
package boundaries; author feature/composition sources and FMS/CMS facts under
the actual gates without assuming a generic recipe generates DDD features. Feature-owned composition publishes its group; outer
composition assembles public groups and Host entries. Domain/application and
semantic ports remain independent of HTTP, ORM, Keycloak and modular frameworks.
Keep credentials and product authorization with their actual owners.

## Verification and delivery

For this documentation-only checkpoint, inspect changed Markdown, local targets
and anchors, source references, diff scope and whitespace. Runtime checks are
not available yet; do not invent successful commands or install a placeholder
managed Docs profile. Keep the README's navigation current.

At first implementation, install the real native changed/fast/full command
routes and all applicable Foundation capabilities described in BOOTSTRAP. The
full route must exercise strict compilation, source coverage, FMS/CMS, contract
checks and focused risk-based tests. Add those exact available commands here
when they exist; avoid decorative unit tests or duplicate verification.

Publish owner-authorized work on reviewable branches. Follow canonical author
and committer identity, preserve actual contributor attribution, and verify
remote contents and PR state. A request for a Draft PR does not request merge
or deployment. Do not alter remote protection or accepted upstream evidence to
make an unrelated check pass.
