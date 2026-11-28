# Identity PostgreSQL 18.7 recovery drill

The [native recovery workflow](../../.github/workflows/identity-postgres-restore.yml)
uses the exact PostgreSQL 18.7 container digest already exercised by Identity
CI. It applies the actual versioned `0001_accounts.sql` migration to an
isolated `identity_test` database, inserts one deliberately suspended account,
a historical ACTIVE login receipt, its consumer attachment and an unacknowledged
outbox event, then performs a physical `pg_dump --format=custom` /
`pg_restore` into a separate `identity_restore_test` database.

The check verifies that the restored schema-migration version, suspended
eligibility, security epoch, historical receipt, attachment and undelivered
outbox are all retained. It never treats an old ACTIVE receipt as a grant.
All credentials are disposable test fixtures, the snapshot remains in the
runner's temporary directory, and the workflow does not touch external
databases. Source and destination database names are explicit.

This tests one **database-level** recovery property, not Keycloak realm
restoration, authority incarnation migration, credential-custody backups,
provider key rotation, application reactivation or recovery point/time
objectives. A production release still requires the P6 runbook, full multi-
service recovery exercise, approved retention policy and live credential/
provider profile. A successful dump alone cannot authorize account access
or bypass the closed/suspended security fences.

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
