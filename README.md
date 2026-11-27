# Identity

Shared account identity and authentication integration for Agent Teams products.
This repository is at the architecture and implementation-planning stage.

The proposed service uses Keycloak for GitHub/GitLab sign-in, credentials and
authentication sessions. Identity owns stable accounts and their lifecycle.
Products retain local users, permissions, sessions and integration credentials.
Direct GitHub/GitLab login does not require a Google account.

## Planning documents

- [Architecture and phased implementation plan](docs/plans/identity-service-implementation-plan.md)
- [Repository bootstrap and full Engineering Foundation adoption](BOOTSTRAP.md)
- [Source audit: public module contracts and Discord's HTTP boundary](docs/research/modules-and-http-source-audit-2026-11-26.md)
- [Latest source refresh after qualification and governance updates](docs/research/modules-source-freshness-2026-11-26.md)
- [Independent review record and verification limits](docs/reviews/identity-plan-review-2026-11-26.md)
- [Review Router integration plan](https://github.com/777genius/review-router-ai/blob/docs/unified-identity-scm-plan-20261126/ai-docs/plans/2026-11-26-unified-identity-and-scm-connections.md), owned and implemented in that consumer repository

The implementation plan selects the expanded service direction while keeping
domain and application independent of Fastify, storage, Keycloak and module
frameworks. It identifies the currently released shared contracts and the
upstream bootstrap work needed before claiming production qualification.

The deep-review decision section makes the remaining material choices explicit:
ordinary legacy proof versus stronger recovery evidence (D6), post-closure
progress (D7), and supported Keycloak enforcement versus a bounded extension
(D8). Each has a recommendation, limitations and a phase gate.

There is no service implementation, production deployment, installed native
toolchain or completed runtime qualification in this planning checkpoint.
Implementation begins with the plan's P0/P1 gates and substantive source.

## Working in this repository

Read [AGENTS.md](AGENTS.md) and [BOOTSTRAP.md](BOOTSTRAP.md) before implementation.
Architecture proposals become accepted through the repository owner's explicit
decision; a planning document or automated review does not confer that status.

See the [documentation map](docs/README.md) for task-oriented navigation.
