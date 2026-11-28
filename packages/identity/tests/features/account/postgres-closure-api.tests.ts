import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Pool } from "pg";
import type { createAccounts } from "../../../src/features/account/adapters/inbound/direct-api.js";
import { createAccountClosures } from "../../../src/features/account/adapters/inbound/direct-closure-api.js";
import { createPostgresClosureStore } from "../../../src/features/account/adapters/outbound/postgres-closures.js";
import type {
  VerifiedHuman,
  VerifiedTerminalWorkload,
} from "../../../src/features/account/domain/authority.js";

interface ClosureFixtures {
  readonly pool: Pool;
  readonly replica: Pool;
  readonly accounts: ReturnType<typeof createAccounts>;
  readonly human: (consumerId?: string) => VerifiedHuman;
}
const terminal = (
  consumerId = "gettok",
  credentialExpiresAtMs = Date.now() + 60_000,
): VerifiedTerminalWorkload => ({
  kind: "terminal-workload",
  clientId: `${consumerId}-terminal`,
  consumerId,
  credentialExpiresAtMs,
});
const api = (pool: Pool) =>
  createAccountClosures({ store: createPostgresClosureStore(pool), maximumClockSkewMs: 0 });
const page = { limit: 16, afterAccountId: "" };

export function registerClosureApiTests(fixtures: ClosureFixtures): void {
  registerPages(fixtures);
  registerReceipts(fixtures);
  registerLockedExpiry(fixtures);
}

function registerPages({ pool, accounts, human }: ClosureFixtures): void {
  void test("terminal closure capability pages only its frozen consumer membership", async () => {
    const opened = await accounts.api.resolveSelf(human(), "terminal-api-first-login");
    await accounts.api.resolveSelf(human("second-product"), "terminal-api-second-login");
    const foreign = await accounts.api.resolveSelf(
      { ...human("second-product"), subject: "foreign-only" },
      "terminal-api-foreign-only",
    );
    await pool.query(
      "UPDATE identity_consumer_attachments SET state = 'detached' WHERE account_id = $1 AND consumer_id = 'gettok'",
      [opened.status.account.accountId],
    );
    await accounts.administration.transition(opened.status.account, "close", 1n);
    await accounts.administration.transition(foreign.status.account, "close", 1n);
    const closures = api(pool);
    const own = await closures.listPendingClosures(terminal(), page);
    assert.equal(own.participants.length, 1);
    assert.equal(own.participants[0]?.accountId, opened.status.account.accountId);
    assert.equal(own.participants[0].manifestVersion, 1);
    assert.equal(own.nextAfterAccountId, "");
    const first = await closures.listPendingClosures(terminal("second-product"), {
      limit: 1,
      afterAccountId: "",
    });
    assert.notEqual(first.nextAfterAccountId, "");
    const next = await closures.listPendingClosures(terminal("second-product"), {
      limit: 1,
      afterAccountId: first.nextAfterAccountId,
    });
    assert.notEqual(next.participants[0]?.accountId, first.participants[0]?.accountId);
    assert.deepEqual(
      (
        await closures.listPendingClosures(terminal("second-product"), {
          limit: 1,
          afterAccountId: next.nextAfterAccountId,
        })
      ).participants,
      [],
    );
    assert.deepEqual(
      (await closures.listPendingClosures(terminal("unknown-product"), page)).participants,
      [],
    );
    assert.deepEqual(
      (await closures.listRepairRequiredClosures(terminal(), page)).participants,
      [],
    );
    await assert.rejects(closures.listPendingClosures(terminal("gettok", Date.now() - 1), page), {
      reason: "UNAUTHENTICATED",
    });
    for (const invalid of [
      { limit: 0, afterAccountId: "" },
      { limit: 17, afterAccountId: "" },
      { limit: 1, afterAccountId: "invalid" },
    ]) {
      await assert.rejects(closures.listPendingClosures(terminal(), invalid), {
        reason: "INVALID_ARGUMENT",
      });
    }
  });
}

function registerReceipts({ pool, replica, accounts, human }: ClosureFixtures): void {
  void test("terminal closure receipts reject foreign stale and conflicting assertions and recover a lost response", async () => {
    const opened = await accounts.api.resolveSelf(human(), "terminal-receipt-admission");
    await pool.query(
      "UPDATE identity_consumer_attachments SET generation = $2 WHERE account_id = $1",
      [opened.status.account.accountId, "9007199254740995"],
    );
    await accounts.administration.transition(opened.status.account, "close", 1n);
    const closures = api(pool);
    const item = (await closures.listPendingClosures(terminal(), page)).participants[0];
    assert.ok(item !== undefined);
    assert.equal(item.participantGeneration, 9_007_199_254_740_995n);
    const receipt = { participant: item, outcome: "repair-required" as const };
    await assert.rejects(closures.reportClosure(terminal("other-product"), receipt), {
      reason: "PERMISSION_DENIED",
    });
    for (const participant of [
      { ...item, accountId: randomUUID() },
      { ...item, authorityIncarnation: "wrong-authority" },
      { ...item, closureRevision: item.closureRevision + 1n },
      { ...item, participantGeneration: item.participantGeneration + 1n },
    ]) {
      await assert.rejects(closures.reportClosure(terminal(), { ...receipt, participant }), {
        reason: "PERMISSION_DENIED",
      });
    }
    for (const participant of [
      { ...item, closureRevision: 0n },
      { ...item, participantGeneration: 9_223_372_036_854_775_808n },
      { ...item, manifestVersion: 0 },
      { ...item, manifestVersion: 2 },
    ]) {
      await assert.rejects(closures.reportClosure(terminal(), { ...receipt, participant }), {
        reason: "INVALID_ARGUMENT",
      });
    }
    const stored = createPostgresClosureStore(pool);
    const lostResponse = createAccountClosures({
      maximumClockSkewMs: 0,
      store: {
        ...stored,
        report: async (report, deadline) => {
          assert.equal(await stored.report(report, deadline), true);
          throw new Error("simulated lost committed response");
        },
      },
    });
    await assert.rejects(lostResponse.reportClosure(terminal(), receipt), {
      message: "simulated lost committed response",
    });
    await api(replica).reportClosure(terminal(), receipt);
    assert.deepEqual((await closures.listPendingClosures(terminal(), page)).participants, []);
    assert.deepEqual((await closures.listRepairRequiredClosures(terminal(), page)).participants, [
      item,
    ]);
    await assert.rejects(closures.reportClosure(terminal(), { ...receipt, outcome: "erased" }), {
      reason: "PERMISSION_DENIED",
    });
    assert.deepEqual((await closures.listRepairRequiredClosures(terminal(), page)).participants, [
      item,
    ]);
  });
}

function registerLockedExpiry({ pool, accounts, human }: ClosureFixtures): void {
  void test(
    "terminal receipt locks before expiry validation and never waits into an unauthorized write",
    { timeout: 10_000 },
    async () => {
      const opened = await accounts.api.resolveSelf(human(), "terminal-lock-admission");
      await accounts.administration.transition(opened.status.account, "close", 1n);
      const item = (await api(pool).listPendingClosures(terminal(), page)).participants[0];
      assert.ok(item !== undefined);
      const receipt = { participant: item, outcome: "not-provisioned" as const };
      const bounded = new Pool({
        connectionString: process.env.IDENTITY_TEST_DATABASE_URL,
        max: 1,
        connectionTimeoutMillis: 2_000,
        query_timeout: 5_000,
        options: "-c lock_timeout=500ms -c statement_timeout=2000ms",
      });
      const blocker = await pool.connect();
      try {
        await blocker.query("BEGIN");
        try {
          await blocker.query(
            "SELECT account_id FROM identity_closure_participants WHERE consumer_id = 'gettok' AND account_id = $1 FOR UPDATE",
            [item.accountId],
          );
          await assert.rejects(
            bounded.query(
              "SELECT account_id FROM identity_closure_participants WHERE account_id = $1 FOR UPDATE NOWAIT",
              [item.accountId],
            ),
            { code: "55P03" },
          );
          await assert.rejects(api(bounded).reportClosure(terminal(), receipt), {
            reason: "PERMISSION_DENIED",
          });
          assert.equal(
            (
              await blocker.query<{ status: string }>(
                "SELECT status FROM identity_closure_participants WHERE account_id = $1",
                [item.accountId],
              )
            ).rows[0]?.status,
            "pending",
          );
        } finally {
          await blocker.query("ROLLBACK");
        }
        await assert.rejects(
          api(bounded).reportClosure(terminal("gettok", Date.now() - 1), receipt),
          { reason: "PERMISSION_DENIED" },
        );
        assert.equal(
          (await api(pool).listPendingClosures(terminal(), page)).participants.length,
          1,
        );
        await api(bounded).reportClosure(terminal(), receipt);
        await api(pool).reportClosure(terminal(), receipt);
        assert.deepEqual((await api(pool).listPendingClosures(terminal(), page)).participants, []);
      } finally {
        blocker.release();
        await bounded.end();
      }
    },
  );
}
