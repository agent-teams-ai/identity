# Identity documentation

Read the [repository instructions](../AGENTS.md) first. This index separates proposed work from observed evidence. It is not a new architecture decision or implementation claim.

## Choose a task

| Task                                                 | Start here                                                                                                                                                                               |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Understand the service scope and current entry point | [Repository README](../README.md), [bootstrap plan](../BOOTSTRAP.md)                                                                                                                     |
| Plan or resume the implementation                    | [identity service implementation plan](plans/identity-service-implementation-plan.md)                                                                                                    |
| Review source and dependency assumptions             | [modules and http source audit 2026 11 26](research/modules-and-http-source-audit-2026-11-26.md); [modules source freshness 2026 11 26](research/modules-source-freshness-2026-11-26.md) |
| Review historical checkpoints                        | [identity plan review 2026 11 26](reviews/identity-plan-review-2026-11-26.md)                                                                                                            |

## Document organization

- [Plans](plans/identity-service-implementation-plan.md): implementation intent, sequencing and explicit remaining work.
- [Research](research/modules-and-http-source-audit-2026-11-26.md): source observations and architectural inputs; not accepted policy by default.
- [Reviews](reviews/identity-plan-review-2026-11-26.md): dated review findings and evidence; do not infer implementation completion.

Place new documents by responsibility, link them from the owning route, and keep existing references stable. Do not copy plans into agent instructions, equate a proposal with a decision, or treat earlier verification as current runtime evidence.
