import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createAccounts } from "../../../src/features/account/adapters/inbound/direct-api.js";
import { createPostgresAccountStore } from "../../../src/features/account/adapters/outbound/postgres-store.js";

const connectionString = process.env.IDENTITY_TEST_DATABASE_URL;
assert.ok(
  connectionString !== undefined,
  "Native lifecycle requires an explicit isolated database",
);
const database = new URL(connectionString);
assert.ok(
  database.pathname === "/identity_test" && ["127.0.0.1", "[::1]"].includes(database.hostname),
  "Native lifecycle is limited to the isolated loopback identity_test database",
);
const [accountId, authorityIncarnation, action, revision] = process.argv.slice(2);
assert.equal(process.argv.length, 6, "Native lifecycle accepts exactly four bounded arguments");
assert.ok(
  accountId !== undefined && /^[0-9a-f-]{36}$/u.test(accountId),
  "Expected a generated fixture account",
);
assert.ok(
  authorityIncarnation === "keycloak-test-v1",
  "Only the isolated native authority is admitted",
);
assert.ok(
  action === "suspend" || action === "enable" || action === "close",
  "Unsupported native lifecycle action",
);
assert.ok(
  revision !== undefined && /^[1-9][0-9]{0,19}$/u.test(revision),
  "Expected a positive bounded revision",
);

const pool = new Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 2_000,
  query_timeout: 5_000,
});
try {
  const accounts = createAccounts({
    store: createPostgresAccountStore(pool),
    newId: randomUUID,
    policy: {
      statusBudgetMs: 60_000,
      maximumClockSkewMs: 5_000,
      allowedProofPolicyVersions: ["1"],
    },
  });
  await accounts.administration.transition(
    { accountId, authorityIncarnation },
    action,
    BigInt(revision),
  );
  process.stdout.write(JSON.stringify({ action, committed: true }));
} finally {
  await pool.end();
}
