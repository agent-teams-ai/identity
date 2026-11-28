# Identity PostgreSQL 18.7 recovery drill

The [native recovery workflow](../../.github/workflows/identity-postgres-restore.yml)
uses the exact PostgreSQL 18.7 container digest already exercised by Identity
CI. It applies the actual versioned `0001_accounts.sql` migration to an
isolated `identity_test` database. A package-owned native fixture calls the
production account API and PostgreSQL adapter to admit three accounts, verifies
each original receipt can replay, then applies real suspend, close and global
logout transitions. The workflow uses `pg_dump --format=custom` / `pg_restore`
to restore this state into a separate `identity_restore_test` database.

The restored production API must expose the original lifecycle state, revision,
security epoch and attachment to its owner and attached workload. It must reject
each original receipt and a new admission attempt using the same pre-transition
actor, return `PERMISSION_DENIED` to an unattached consumer, and refuse to enable
the closed account. Suspended/closed status remains readable under the existing
contract; that observation does not grant admission. Original proof timestamps
and deadlines are read from the restored receipts, without renewing authority.

Separate SQL checks retain the schema version, all three accounts and old
receipts, bindings, attachments, six undelivered events, six audit records and
the closed account's pending cleanup participant. The disposable fixture actors
enter at the already verified account boundary; this drill does not authenticate
them through Keycloak. Source and destination names are explicit loopback TEST
databases. The snapshot stays in the runner's temporary directory.

This qualifies the restored database's account fences through the production
account API. Keycloak realm restoration, authority incarnation migration,
credential-custody backups, provider key rotation, application reactivation and
recovery point/time objectives remain unqualified. A production release still
requires the P6 runbook, full multi-service recovery exercise, approved retention
policy and live credential/provider profile.

## HTTP shutdown qualification

The required real TCP test in `apps/server/tests/features/http/connect-http.test.ts`
holds an incomplete request after the actual Fastify/Connect host has accepted
its headers. Two concurrent shutdown callers must share the same cleanup flight,
the pending socket must physically close, the incomplete request must never
reach the account use case, and the listener must refuse a new connection.
The five-second test deadline also aborts its owned sockets on failure.
The named execution contract makes this scenario mandatory in `pnpm test`;
its result belongs to the exact source commit on which that command executes.
This qualifies HTTP shutdown separately from the database restore drill and
does not establish a production capacity or recovery-time objective.
