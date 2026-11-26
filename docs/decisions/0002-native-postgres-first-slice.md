---
id: ADR-0002
status: accepted
date: 2026-11-26
---

# ADR-0002: Native PostgreSQL for the first account slice

## Context

The account adapter needs transactions, row locks, uniqueness and parameterized
SQL. Qualification of current Drizzle0.45.4 against the adopted strict
TypeScript7.0.2 failed in vendor declarations. Three real public-entry probes
(importing root SQL, narrow SQL and the node-postgres driver alone) each reported
72 diagnostics: 11 optional peer-module failures and 61 declaration failures.
Changing the SQL export did not change that closure. Extra unrelated dialect
peers could not resolve the declaration failures.

The initial local probe outputs were lost when the execution environment was
replaced. This record preserves the observed finding and owner selection; it
does not substitute for retained raw evidence or claim a repeated qualification.

## Decision

The owner selected published pg8.23.1 with versioned parameterized SQL for the
first implementation. The AccountStore semantic port and inward dependency
boundaries remain unchanged. SQL lives with the account outbound adapter.
Native PostgreSQL18.7 integration tests must prove atomic first login,
idempotency, lifecycle serialization and rollback.

Do not disable library checking, reduce strictness, add an unrelated ORM, adopt
an unqualified release candidate, fork vendor declarations or manufacture a
bridge to conceal the failed qualification. Drizzle is absent from the runtime
and dependency catalog in this slice.

## Consequences

This narrows the initial adapter implementation without changing the agreed
architecture. Later Drizzle adoption requires a current published release that
passes the same strict compiler closure and the existing real PostgreSQL
behavior tests. No code outside the adapter should require that migration.
