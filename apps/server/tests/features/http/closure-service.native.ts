import assert from "node:assert/strict";
import { Code, ConnectError, createClient, type Client } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import {
  ClosureReceiptOutcome,
  IdentityClosureService,
  IdentityService,
  type AccountReference,
} from "@agent-teams/identity-contracts";
import { Pool } from "pg";

const authority = (token: string) => ({ headers: { authorization: `Bearer ${token}` } });
const denied = (error: unknown): boolean =>
  error instanceof ConnectError && error.code === Code.PermissionDenied;

interface TerminalFixture {
  readonly baseUrl: string;
  readonly ordinary: Client<typeof IdentityService>;
  readonly account: AccountReference;
  readonly human: string;
  readonly workload: string;
  readonly terminal: string;
  readonly secondTerminal: string;
}

/** Real Keycloak credentials, production composition/Connect and actual PostgreSQL. */
export async function exerciseTerminalTransport(input: TerminalFixture): Promise<void> {
  const connectionString = process.env.IDENTITY_TEST_DATABASE_URL;
  assert.ok(connectionString !== undefined);
  const database = new URL(connectionString);
  assert.ok(
    ["postgres:", "postgresql:"].includes(database.protocol) &&
      database.pathname === "/identity_test" &&
      ["127.0.0.1", "[::1]"].includes(database.hostname) &&
      database.search === "" &&
      database.hash === "",
  );
  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 2_000,
    query_timeout: 5_000,
  });
  try {
    // This test-only detach verifies terminal rights do not depend on live access.
    await pool.query(
      "UPDATE identity_consumer_attachments SET state = 'detached', revision = revision + 1 WHERE account_id = $1 AND consumer_id = 'gettok'",
      [input.account.accountId],
    );
    await assert.rejects(
      input.ordinary.getAccountStatus({ account: input.account }, authority(input.workload)),
      denied,
    );
    const client = createClient(
      IdentityClosureService,
      createConnectTransport({ baseUrl: input.baseUrl, httpVersion: "1.1" }),
    );
    const terminal = authority(input.terminal);
    const second = authority(input.secondTerminal);
    for (const token of [input.human, input.workload]) {
      await assert.rejects(client.listPendingClosures({ limit: 16 }, authority(token)), denied);
      await assert.rejects(
        client.listRepairRequiredClosures({ limit: 16 }, authority(token)),
        denied,
      );
    }
    await assert.rejects(
      input.ordinary.getAccountStatus({ account: input.account }, terminal),
      denied,
    );
    await assert.rejects(input.ordinary.getSelfStatus({}, terminal), denied);
    const pending = await client.listPendingClosures({ limit: 16 }, terminal);
    assert.equal(pending.participants.length, 1);
    const participant = pending.participants[0];
    assert.ok(participant !== undefined);
    assert.deepEqual(participant.account, input.account);
    assert.equal(participant.manifestVersion, 1);
    assert.equal((await client.listPendingClosures({ limit: 16 }, second)).participants.length, 1);
    assert.deepEqual(
      (await client.listRepairRequiredClosures({ limit: 16 }, terminal)).participants,
      [],
    );
    for (const wrong of [
      { ...participant, closureRevision: participant.closureRevision + 1n },
      { ...participant, participantGeneration: participant.participantGeneration + 1n },
      {
        ...participant,
        account: { ...input.account, authorityIncarnation: "unrelated-incarnation" },
      },
    ]) {
      await assert.rejects(
        client.reportClosure(
          { participant: wrong, outcome: ClosureReceiptOutcome.REPAIR_REQUIRED },
          terminal,
        ),
        denied,
      );
    }
    const receipt = { participant, outcome: ClosureReceiptOutcome.REPAIR_REQUIRED };
    for (const token of [input.human, input.workload]) {
      await assert.rejects(client.reportClosure(receipt, authority(token)), denied);
    }
    assert.equal((await client.reportClosure(receipt, terminal)).accepted, true);
    assert.equal(
      (await client.reportClosure(receipt, terminal)).accepted,
      true,
      "Exact replay recovers the same receipt",
    );
    assert.deepEqual((await client.listPendingClosures({ limit: 16 }, terminal)).participants, []);
    assert.deepEqual(
      (await client.listRepairRequiredClosures({ limit: 16 }, terminal)).participants,
      [participant],
    );
    const other = (await client.listPendingClosures({ limit: 16 }, second)).participants[0];
    assert.ok(other !== undefined, "One consumer's report never settles another consumer");
    await assert.rejects(
      client.reportClosure({ participant, outcome: ClosureReceiptOutcome.ERASED }, terminal),
      denied,
    );
    assert.equal(
      (
        await client.reportClosure(
          { participant: other, outcome: ClosureReceiptOutcome.REPAIR_REQUIRED },
          second,
        )
      ).accepted,
      true,
    );
    const outcomes = await pool.query<{ consumer_id: string; status: string }>(
      "SELECT consumer_id, status FROM identity_closure_participants WHERE account_id = $1 ORDER BY consumer_id",
      [input.account.accountId],
    );
    assert.deepEqual(outcomes.rows, [
      { consumer_id: "gettok", status: "repair-required" },
      { consumer_id: "second-product", status: "repair-required" },
    ]);
  } finally {
    await pool.end();
  }
}
