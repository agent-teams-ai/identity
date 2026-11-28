import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { createAccounts } from "../../../src/features/account/adapters/inbound/direct-api.js";
import { createPostgresAccountStore } from "../../../src/features/account/adapters/outbound/postgres-store.js";
import { AccountFailure } from "../../../src/features/account/domain/model.js";
import type { VerifiedHuman } from "../../../src/features/account/domain/authority.js";

const cases = [
  { subject: "suspended", action: "suspend", state: "suspended", reason: "ACCOUNT_SUSPENDED" },
  { subject: "closed", action: "close", state: "closed", reason: "ACCOUNT_CLOSED" },
  {
    subject: "logout",
    action: "global-logout",
    state: "active",
    reason: "AUTHENTICATION_REQUIRED_AFTER_CUTOFF",
  },
] as const;
const receiptKey = (subject: string): string => `recovery-${subject}-original`;
const denied =
  (reason: string) =>
  (error: unknown): boolean =>
    error instanceof AccountFailure && error.reason === reason;

function human(subject: string, authenticatedAtMs: number, validUntilMs: number): VerifiedHuman {
  return {
    kind: "human",
    authorityId: "recovery-test",
    issuer: "https://identity.test/realms/recovery",
    subject,
    authorityIncarnation: "recovery-test-v1",
    consumerId: "gettok",
    clientId: "gettok-web",
    authoritySessionId: `recovery-${subject}-session`,
    signedInAtMs: authenticatedAtMs,
    credentialExpiresAtMs: validUntilMs,
    proof: {
      profile: "provider-session-control-v1",
      authenticatedAtMs,
      validUntilMs,
      policyVersion: "1",
      scope: "gettok.personal",
    },
  };
}

const phase = process.argv[2];
assert.ok(process.argv.length === 3 && (phase === "seed" || phase === "verify"));
const connectionString = process.env.IDENTITY_RECOVERY_DATABASE_URL;
assert.ok(connectionString !== undefined, "Recovery fixture requires its disposable database");
const url = new URL(connectionString);
assert.ok(
  ["postgres:", "postgresql:"].includes(url.protocol) &&
    ["127.0.0.1", "[::1]"].includes(url.hostname) &&
    url.search === "" &&
    url.hash === "" &&
    url.pathname === (phase === "seed" ? "/identity_test" : "/identity_restore_test"),
  "Recovery fixture accepts only its phase-specific loopback TEST database",
);
const pool = new Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 2_000,
  query_timeout: 5_000,
});
const accounts = createAccounts({
  store: createPostgresAccountStore(pool),
  newId: randomUUID,
  policy: { statusBudgetMs: 60_000, maximumClockSkewMs: 0, allowedProofPolicyVersions: ["1"] },
});

async function seed(): Promise<void> {
  const count = await pool.query<{ count: number }>("SELECT count(*)::int FROM identity_accounts");
  assert.equal(count.rows[0]?.count, 0, "Seed refuses existing account data");
  const now = Date.now();
  for (const scenario of cases) {
    const actor = human(scenario.subject, now - 10_000, now + 300_000);
    const first = await accounts.api.resolveSelf(actor, receiptKey(scenario.subject));
    assert.equal(first.status.eligibility, "active");
    assert.deepEqual(await accounts.api.resolveSelf(actor, receiptKey(scenario.subject)), first);
    await accounts.administration.transition(
      first.status.account,
      scenario.action,
      first.status.accountRevision,
    );
  }
}

async function verify(): Promise<void> {
  const receipts = await pool.query<{
    subject: string;
    account_id: string;
    proof_authenticated_at_ms: string;
    proof_valid_until_ms: string;
  }>(
    "SELECT subject, account_id, proof_authenticated_at_ms, proof_valid_until_ms FROM identity_resolution_receipts WHERE authority_id = 'recovery-test'",
  );
  assert.equal(
    receipts.rows.length,
    cases.length,
    "All original production receipts survived restore",
  );
  for (const scenario of cases) {
    const receipt = receipts.rows.find((row) => row.subject === scenario.subject);
    assert.ok(receipt !== undefined);
    const actor = human(
      scenario.subject,
      Number(receipt.proof_authenticated_at_ms),
      Number(receipt.proof_valid_until_ms),
    );
    const status = await accounts.api.getSelfStatus(actor);
    assert.equal(status.account.accountId, receipt.account_id);
    assert.equal(status.account.authorityIncarnation, "recovery-test-v1");
    assert.equal(status.eligibility, scenario.state);
    assert.equal(status.accountRevision, 2n);
    assert.equal(status.securityEpoch, 2n);
    assert.equal(status.attachmentGeneration, 1n);
    assert.ok(status.authenticationCutoffMs > actor.signedInAtMs);
    const workload = {
      kind: "workload",
      clientId: "gettok-status",
      consumerId: "gettok",
      credentialExpiresAtMs: actor.credentialExpiresAtMs,
    } as const;
    const observed = await accounts.api.getAccountStatus(workload, status.account);
    assert.equal(observed.eligibility, scenario.state);
    assert.equal(observed.securityEpoch, status.securityEpoch);
    assert.equal(observed.authenticationCutoffMs, status.authenticationCutoffMs);
    assert.equal(observed.attachmentGeneration, status.attachmentGeneration);
    await assert.rejects(
      accounts.api.resolveSelf(actor, receiptKey(scenario.subject)),
      denied(scenario.reason),
    );
    await assert.rejects(
      accounts.api.resolveSelf(actor, `recovery-${scenario.subject}-new-attempt`),
      denied(scenario.reason),
    );
    await assert.rejects(
      accounts.api.getAccountStatus({ ...workload, consumerId: "unattached" }, status.account),
      denied("PERMISSION_DENIED"),
    );
    if (scenario.state === "closed") {
      await assert.rejects(
        accounts.administration.transition(status.account, "enable", 2n),
        denied("ACCOUNT_CLOSED"),
      );
    }
  }
}

try {
  await (phase === "seed" ? seed() : verify());
  process.stdout.write(
    `${JSON.stringify({ recoveryPhase: phase, productionAccountApi: "passed", providerRecovery: "not-qualified" })}\n`,
  );
} finally {
  await pool.end();
}
