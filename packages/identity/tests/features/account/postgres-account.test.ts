import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { after, before, beforeEach, test } from "node:test";
import { Pool } from "pg";
import { createAccounts } from "../../../src/features/account/adapters/inbound/direct-api.js";
import { createPostgresAccountStore } from "../../../src/features/account/adapters/outbound/postgres-store.js";
import { AccountFailure } from "../../../src/features/account/domain/model.js";
import type {
  AccountStore,
  AccountTransaction,
} from "../../../src/features/account/application/ports/account-store.js";
import type {
  VerifiedHuman,
  VerifiedWorkload,
} from "../../../src/features/account/domain/authority.js";

const connectionString = process.env.IDENTITY_TEST_DATABASE_URL;
if (connectionString === undefined || new URL(connectionString).pathname !== "/identity_test") {
  throw new Error("Essential PostgreSQL checks require the isolated identity_test database");
}
const pool = new Pool({
  connectionString,
  max: 8,
  connectionTimeoutMillis: 2_000,
  query_timeout: 5_000,
});
const replica = new Pool({
  connectionString,
  max: 8,
  connectionTimeoutMillis: 2_000,
  query_timeout: 5_000,
});
const store = createPostgresAccountStore(pool);
const replicaStore = createPostgresAccountStore(replica);
const dependencies = (value: AccountStore = store) => ({
  store: value,
  newId: randomUUID,
  policy: { statusBudgetMs: 60_000, maximumClockSkewMs: 0, allowedProofPolicyVersions: ["1"] },
});
const accounts = createAccounts(dependencies());
const otherReplica = createAccounts(dependencies(replicaStore));
const reason =
  (value: string) =>
  (error: unknown): boolean =>
    error instanceof AccountFailure && error.reason === value;

function human(consumerId = "gettok"): VerifiedHuman {
  const now = Date.now();
  return {
    kind: "human",
    authorityId: "primary",
    issuer: "https://identity.test/realms/test",
    subject: "human-1",
    authorityIncarnation: "test-realm-1",
    consumerId,
    clientId: `${consumerId}-web`,
    authoritySessionId: "session-1",
    signedInAtMs: now - 10_000,
    credentialExpiresAtMs: now + 300_000,
    proof: {
      profile: "provider-session-control-v1",
      authenticatedAtMs: now - 10_000,
      validUntilMs: now + 300_000,
      policyVersion: "1",
      scope: `${consumerId}.personal`,
    },
  };
}
const workload = (consumerId = "gettok"): VerifiedWorkload => ({
  kind: "workload",
  clientId: `${consumerId}-status`,
  consumerId,
  credentialExpiresAtMs: Date.now() + 300_000,
});

before(async () => {
  const existing = await pool.query<{ readonly present: string | null }>(
    "SELECT to_regclass('identity_schema_migrations')::text AS present",
  );
  if (existing.rows[0]?.present === null) {
    await pool.query(
      await readFile(
        "packages/identity/src/features/account/adapters/outbound/migrations/0001_accounts.sql",
        "utf8",
      ),
    );
  }
});
beforeEach(async () => {
  await pool.query(
    "TRUNCATE identity_accounts, identity_authority_bindings, identity_consumer_attachments, identity_resolution_receipts, identity_security_audit, identity_outbox, identity_closure_participants",
  );
});
after(async () => {
  await Promise.all([pool.end(), replica.end()]);
});

void test("two replicas racing first admission commit exactly one account and attachment", async () => {
  const actor = human();
  const results = await Promise.all(
    Array.from({ length: 12 }, async (_, index) =>
      (index % 2 === 0 ? accounts : otherReplica).api.resolveSelf(
        actor,
        `concurrent-login-${index.toString().padStart(2, "0")}`,
      ),
    ),
  );
  assert.equal(new Set(results.map((value) => value.status.account.accountId)).size, 1);
  const counts = await pool.query<{
    accounts: number;
    attachments: number;
    receipts: number;
    events: number;
  }>(
    "SELECT (SELECT count(*)::int FROM identity_accounts) AS accounts, (SELECT count(*)::int FROM identity_consumer_attachments) AS attachments, (SELECT count(*)::int FROM identity_resolution_receipts) AS receipts, (SELECT count(*)::int FROM identity_outbox) AS events",
  );
  assert.deepEqual(counts.rows[0], { accounts: 1, attachments: 1, receipts: 12, events: 1 });
});

void test("invalid proof cannot leave a partial account, binding, attachment, receipt or event", async () => {
  const actor = human();
  await assert.rejects(
    accounts.api.resolveSelf(
      { ...actor, proof: { ...actor.proof, validUntilMs: Date.now() - 1 } },
      "invalid-proof-attempt",
    ),
    reason("INSUFFICIENT_PROOF"),
  );
  for (const table of [
    "identity_accounts",
    "identity_authority_bindings",
    "identity_consumer_attachments",
    "identity_resolution_receipts",
    "identity_outbox",
    "identity_security_audit",
  ]) {
    // Identifiers are the fixed table allowlist above; no caller data reaches SQL.
    const count = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM ${table}`,
    );
    assert.equal(count.rows[0]?.count, 0, table);
  }
});

void test("receipt replay preserves original deadlines and rejects actor changes or old evidence", async () => {
  const actor = human();
  const first = await accounts.api.resolveSelf(actor, "stable-receipt-key-1");
  assert.deepEqual(await otherReplica.api.resolveSelf(actor, "stable-receipt-key-1"), first);
  await assert.rejects(
    accounts.api.resolveSelf(
      { ...actor, authoritySessionId: "another-session" },
      "stable-receipt-key-1",
    ),
    reason("CONFLICT"),
  );
  await pool.query(
    "UPDATE identity_resolution_receipts SET status_valid_until_ms = observed_at_ms + 1",
  );
  await assert.rejects(
    accounts.api.resolveSelf(actor, "stable-receipt-key-1"),
    reason("ADMISSION_EXPIRED"),
  );
});

void test("status cannot enumerate or create attachments and authority restoration cannot claim a new account", async () => {
  const actor = human();
  const first = await accounts.api.resolveSelf(actor, "first-owned-login-1");
  await assert.rejects(
    accounts.api.getAccountStatus(workload("another-product"), first.status.account),
    reason("PERMISSION_DENIED"),
  );
  await assert.rejects(
    accounts.api.getAccountStatus(workload(), { ...first.status.account, accountId: randomUUID() }),
    reason("PERMISSION_DENIED"),
  );
  await assert.rejects(
    accounts.api.getSelfStatus({ ...actor, consumerId: "another-product" }),
    reason("REATTACHMENT_REQUIRED"),
  );
  await assert.rejects(
    accounts.api.resolveSelf(
      { ...actor, authorityIncarnation: "restored-realm" },
      "restored-realm-login",
    ),
    reason("REPAIR_REQUIRED"),
  );
  const count = await pool.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM identity_consumer_attachments",
  );
  assert.equal(count.rows[0]?.count, 1);
});

void test("suspend and enable preserve revocation even when a consumer missed every event", async () => {
  const actor = human();
  const first = await accounts.api.resolveSelf(actor, "before-suspend-login");
  await accounts.administration.transition(first.status.account, "suspend", 1n);
  await assert.rejects(
    accounts.api.resolveSelf(actor, "before-suspend-login"),
    reason("ACCOUNT_SUSPENDED"),
  );
  await accounts.administration.transition(first.status.account, "enable", 2n);
  const current = await accounts.api.getAccountStatus(workload(), first.status.account);
  assert.equal(current.eligibility, "active");
  assert.equal(current.accountRevision, 3n);
  assert.equal(current.securityEpoch, first.status.securityEpoch + 1n);
  await assert.rejects(
    accounts.api.resolveSelf(actor, "after-enable-login-1"),
    reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"),
  );
  await assert.rejects(
    accounts.api.resolveSelf(actor, "before-suspend-login"),
    reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"),
  );
});

void test("detachment cannot be undone by login; reattachment counters and cutoff fence old sessions", async () => {
  const actor = human();
  const first = await accounts.api.resolveSelf(actor, "before-detach-login-1");
  await pool.query(
    "UPDATE identity_consumer_attachments SET state='detached', revision=revision+1 WHERE account_id=$1",
    [first.status.account.accountId],
  );
  await assert.rejects(
    accounts.api.resolveSelf(actor, "after-detach-login-1"),
    reason("REATTACHMENT_REQUIRED"),
  );
  await assert.rejects(
    accounts.api.getAccountStatus(workload(), first.status.account),
    reason("PERMISSION_DENIED"),
  );
  await pool.query(
    "UPDATE identity_consumer_attachments SET state='active', generation=$2, reattachment_cutoff_ms=floor(extract(epoch FROM clock_timestamp())*1000)::bigint WHERE account_id=$1",
    [first.status.account.accountId, "9007199254740995"],
  );
  assert.equal(
    (await accounts.api.getAccountStatus(workload(), first.status.account)).attachmentGeneration,
    9_007_199_254_740_995n,
  );
  await assert.rejects(
    accounts.api.resolveSelf(actor, "after-reattach-login"),
    reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"),
  );
});

function interceptStore(
  base: AccountStore,
  wrap: (tx: AccountTransaction) => AccountTransaction,
): AccountStore {
  return {
    transaction: async (run) => base.transaction(async (tx) => run(wrap(tx))),
    resolveTransaction: async (authority, run) =>
      base.resolveTransaction(authority, async (tx) => run(wrap(tx))),
  };
}

void test(
  "closure captures a first attachment that commits before the lifecycle gate is acquired",
  { timeout: 10_000 },
  async () => {
    const first = await accounts.api.resolveSelf(human(), "first-closure-login");
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const joining = createAccounts(
      dependencies(
        interceptStore(replicaStore, (tx) => ({
          ...tx,
          createAttachment: async (attachment) => {
            await tx.createAttachment(attachment);
            entered.resolve();
            await release.promise;
          },
        })),
      ),
    );
    const attachment = joining.api.resolveSelf(human("future-product"), "joining-closure-login");
    await entered.promise;
    const closure = accounts.administration.transition(first.status.account, "close", 1n);
    release.resolve();
    await Promise.all([attachment, closure]);
    const participants = await pool.query<{ consumer_id: string }>(
      "SELECT consumer_id FROM identity_closure_participants ORDER BY consumer_id",
    );
    assert.deepEqual(
      participants.rows.map((value) => value.consumer_id),
      ["future-product", "gettok"],
    );
    await assert.rejects(
      accounts.api.resolveSelf(human("late-product"), "late-closure-login-1"),
      reason("ACCOUNT_CLOSED"),
    );
  },
);

void test(
  "closure committing first excludes late attachments without losing any existing participant",
  { timeout: 10_000 },
  async () => {
    const first = await accounts.api.resolveSelf(human(), "first-terminal-login");
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const closing = createAccounts(
      dependencies(
        interceptStore(store, (tx) => ({
          ...tx,
          lockAccount: async (id) => {
            const value = await tx.lockAccount(id);
            entered.resolve();
            await release.promise;
            return value;
          },
        })),
      ),
    );
    const closure = closing.administration.transition(first.status.account, "close", 1n);
    await entered.promise;
    const late = otherReplica.api.resolveSelf(human("late-product"), "late-terminal-login");
    const denied = assert.rejects(late, reason("ACCOUNT_CLOSED"));
    release.resolve();
    await Promise.all([closure, denied]);
    const participants = await pool.query<{ consumer_id: string }>(
      "SELECT consumer_id FROM identity_closure_participants",
    );
    assert.deepEqual(participants.rows, [{ consumer_id: "gettok" }]);
  },
);
