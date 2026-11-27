# Identity

Shared account identity and authentication integration for Agent Teams products.
The expanded service is being implemented with **GetTok as its first consumer**.

The current implementation contains the account domain and semantic ports,
PostgreSQL persistence, Keycloak token boundary, versioned Protobuf/Connect
contracts with TypeScript and Go bindings, and a Fastify HTTP Host. Products
retain their local users, permissions, sessions and integration credentials.

This is an implementation checkpoint under qualification. It does not represent
a completed service rollout or claim that later recovery, independent-factor,
durable delivery and operational phases have shipped. The Keycloak ordinary
login profile cannot be used as independent continuity evidence.

## Architecture and implementation

- [Architecture and phased implementation plan](docs/plans/identity-service-implementation-plan.md)
- [Bootstrap, shared-tooling pins and admission prerequisites](BOOTSTRAP.md)
- [Accepted architecture decisions](docs/decisions/README.md)
- [PostgreSQL backup/restore TEST drill](docs/operations/postgresql-recovery-drill.md)
- [Module adoption and native contract ownership](docs/architecture/module-adoption.md)
- [Single FMS/CMS source profile](architecture/foundation/feature-modules.json)
- [Versioned public contract](packages/contracts/README.md)
- [Source audit: module contracts and Discord HTTP boundary](docs/research/modules-and-http-source-audit-2026-11-26.md)
- [Plan source refresh](docs/research/modules-source-freshness-2026-11-26.md)
- [Plan review record and its limits](docs/reviews/identity-plan-review-2026-11-26.md)

Direct GitHub/GitLab login through the broker remains the intended product
journey, without an intermediate Google account. Provider consent and product
repository authorization are separate grants. The first consumer work belongs
to GetTok; [Review Router's integration plan](https://github.com/777genius/review-router-ai/blob/docs/unified-identity-scm-plan-20261126/ai-docs/plans/2026-11-26-unified-identity-and-scm-connections.md)
remains available for its later owning implementation.

## Development

Read [AGENTS.md](AGENTS.md) for exact native prerequisites, commands, ownership
and publication rules. Use the pinned Node/pnpm graph and Stack's public
toolchain. `pnpm check` compiles real source, checks the architecture and complete
quality scope, validates native contracts, and runs focused mandatory tests.
Database and provider checks require their actual disposable services.

Central admission, managed Docs adoption, native qualification and production
rollout are separate evidence. Their current state is recorded in BOOTSTRAP and
the owning PR checks; local source or a static profile alone does not prove them.
