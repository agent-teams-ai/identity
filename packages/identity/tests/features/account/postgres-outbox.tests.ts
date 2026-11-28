import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import type { createAccounts } from "../../../src/features/account/adapters/inbound/direct-api.js";
import { createPostgresOutboxDelivery } from "../../../src/features/account/adapters/outbound/postgres-outbox.js";
import { deliverAccountEvent } from "../../../src/features/account/application/use-cases/deliver-account-events.js";
import type {
  VerifiedHuman,
  VerifiedWorkload,
} from "../../../src/features/account/domain/authority.js";

interface OutboxFixtures {
  readonly pool: Pool;
  readonly replica: Pool;
  readonly accounts: ReturnType<typeof createAccounts>;
  readonly human: (consumerId?: string) => VerifiedHuman;
  readonly workload: (consumerId?: string) => VerifiedWorkload;
}

/** Registers outbox scenarios against the owner's single PostgreSQL test lifecycle. */
export function registerOutboxTests({
  pool,
  replica,
  accounts,
  human,
  workload,
}: OutboxFixtures): void {
  void test("outbox claims are recipient-scoped and exclusive across actual PostgreSQL replicas", async () => {
    const admitted = await accounts.api.resolveSelf(human(), "outbox-first-admission");
    const primary = createPostgresOutboxDelivery(pool, "gettok");
    const competitor = createPostgresOutboxDelivery(replica, "gettok");
    const otherConsumer = createPostgresOutboxDelivery(replica, "other-product");
    const [first, second] = await Promise.all([
      primary.claimNext(60_000),
      competitor.claimNext(60_000),
    ]);
    const event = first ?? second;
    assert.ok(event !== undefined, "Exactly one worker claims an event");
    assert.equal(first === undefined || second === undefined, true, "No duplicate concurrent claim");
    assert.equal(event.accountId, admitted.status.account.accountId);
    assert.equal(event.consumerId, "gettok");
    assert.equal(event.kind, "account.attached");
    assert.equal(event.accountRevision, 1n);
    assert.equal(event.claimGeneration, 1n);
    assert.equal(await otherConsumer.claimNext(60_000), undefined);
    assert.equal(await otherConsumer.acknowledge(event), false, "Different consumer cannot settle");
    assert.equal(await competitor.acknowledge(event), true, "Owner's other replica may settle");
    assert.equal(await primary.acknowledge(event), false, "Duplicate completion is not accepted");
    assert.equal(await primary.claimNext(60_000), undefined);

    const secondAdmission = await accounts.api.resolveSelf(
      human("other-product"),
      "outbox-second-product",
    );
    assert.equal(secondAdmission.status.account.accountId, event.accountId);
    assert.equal(await primary.claimNext(60_000), undefined, "No cross-consumer enumeration");
    const next = await otherConsumer.claimNext(60_000);
    assert.ok(next !== undefined);
    assert.equal(next.consumerId, "other-product");
    assert.equal(next.accountId, event.accountId);
    assert.equal(await otherConsumer.acknowledge(next), true);
  });

  void test("outbox lease expiry advances generation and rejects stale acknowledgements", async () => {
    await accounts.api.resolveSelf(human(), "outbox-lease-admission");
    const firstWorker = createPostgresOutboxDelivery(pool, "gettok");
    const secondWorker = createPostgresOutboxDelivery(replica, "gettok");
    await assert.rejects(firstWorker.claimNext(0), RangeError);
    assert.throws(() => createPostgresOutboxDelivery(pool, "gettok; DROP TABLE"), TypeError);
    const initial = await firstWorker.claimNext(60_000);
    assert.ok(initial !== undefined);
    await pool.query("UPDATE identity_outbox SET claimed_until_ms = 0 WHERE event_id = $1", [
      initial.eventId,
    ]);
    const reassigned = await secondWorker.claimNext(60_000);
    assert.ok(reassigned !== undefined);
    assert.equal(reassigned.eventId, initial.eventId);
    assert.equal(reassigned.claimGeneration, initial.claimGeneration + 1n);
    assert.equal(await firstWorker.acknowledge(initial), false, "Expired ownership cannot settle");
    assert.equal(await secondWorker.acknowledge(reassigned), true);
    assert.equal(await firstWorker.claimNext(60_000), undefined);
  });

  void test("closure outcomes require exact terminal account, generation and trusted recipient", async () => {
    const opened = await accounts.api.resolveSelf(human(), "closure-receipt-gettok");
    await accounts.api.resolveSelf(human("other-product"), "closure-receipt-other");
    await accounts.administration.transition(opened.status.account, "close", 1n);
    const rows = await pool.query<{
      readonly consumer_id: string;
      readonly closure_revision: string;
      readonly participant_generation: string;
    }>(
      "SELECT consumer_id, closure_revision, participant_generation FROM identity_closure_participants ORDER BY consumer_id",
    );
    assert.equal(rows.rows.length, 2);
    const owned = rows.rows.find((row) => row.consumer_id === "gettok");
    assert.ok(owned !== undefined);
    const report = {
      consumerId: "gettok",
      accountId: opened.status.account.accountId,
      closureRevision: BigInt(owned.closure_revision),
      participantGeneration: BigInt(owned.participant_generation),
      outcome: "retained-by-policy" as const,
    };
    const gettok = createPostgresOutboxDelivery(pool, "gettok");
    const other = createPostgresOutboxDelivery(replica, "other-product");
    assert.equal(await other.reportClosure(report), false, "Foreign consumer cannot report");
    assert.equal(
      await gettok.reportClosure({ ...report, closureRevision: report.closureRevision + 1n }),
      false,
      "Wrong terminal revision cannot settle",
    );
    assert.equal(
      await gettok.reportClosure({
        ...report,
        participantGeneration: report.participantGeneration + 1n,
      }),
      false,
      "Wrong participant generation cannot settle",
    );
    assert.equal(await gettok.reportClosure(report), true);
    assert.equal(await gettok.reportClosure(report), false, "No duplicate terminal receipt");
    const status = await pool.query<{ readonly consumer_id: string; readonly status: string }>(
      "SELECT consumer_id, status FROM identity_closure_participants ORDER BY consumer_id",
    );
    assert.deepEqual(status.rows, [
      { consumer_id: "gettok", status: "retained-by-policy" },
      { consumer_id: "other-product", status: "pending" },
    ]);
    assert.equal(
      await other.reportClosure({ ...report, outcome: "erased" }),
      false,
      "Another recipient cannot claim the first participant",
    );
    const second = rows.rows.find((row) => row.consumer_id === "other-product");
    assert.ok(second !== undefined);
    assert.equal(
      await other.reportClosure({
        consumerId: "other-product",
        accountId: report.accountId,
        closureRevision: BigInt(second.closure_revision),
        participantGeneration: BigInt(second.participant_generation),
        outcome: "erased",
      }),
      true,
      "Each recipient alone can report its own terminal item",
    );
  });

  void test("outbox dispatch acknowledges only after recipient success and preserves redelivery", async () => {
    await accounts.api.resolveSelf(human(), "dispatch-first-admission");
    const outbox = createPostgresOutboxDelivery(pool, "gettok");
    let delivered = 0;
    await assert.rejects(
      deliverAccountEvent(
        outbox,
        async () => {
          delivered += 1;
          throw new Error("recipient transport failed with an unsafe secret");
        },
        1000,
      ),
      /Identity consumer delivery failed/,
    );
    const claimed = await pool.query<{
      readonly event_id: string;
      readonly published_at_ms: string | null;
    }>("SELECT event_id, published_at_ms FROM identity_outbox");
    assert.equal(claimed.rows.length, 1);
    assert.equal(claimed.rows[0]?.published_at_ms, null, "A failed send never publishes the event");
    await pool.query("UPDATE identity_outbox SET claimed_until_ms = 0");
    const observed: string[] = [];
    assert.equal(
      await deliverAccountEvent(
        outbox,
        async (event) => {
          observed.push(event.eventId);
        },
        1000,
      ),
      "acknowledged",
    );
    assert.equal(observed.length, 1);
    assert.equal(delivered, 1);
    assert.equal(await deliverAccountEvent(outbox, async () => {}, 1000), "empty");
  });

  void test("recipient outboxes retain both consumers' attach/suspend/enable fences", async () => {
    const admitted = await accounts.api.resolveSelf(human(), "multi-event-first-admission");
    const second = await accounts.api.resolveSelf(
      human("other-product"),
      "multi-event-second-admission",
    );
    assert.deepEqual(admitted.status.account, second.status.account);
    await accounts.administration.transition(admitted.status.account, "suspend", 1n);
    await accounts.administration.transition(admitted.status.account, "enable", 2n);

    for (const consumerId of ["gettok", "other-product"]) {
      const outbox = createPostgresOutboxDelivery(pool, consumerId);
      const observed: {
        readonly kind: string;
        readonly accountRevision: bigint;
        readonly securityEpoch: bigint;
        readonly attachmentGeneration: bigint;
      }[] = [];
      for (let index = 0; index < 3; index += 1) {
        const event = await outbox.claimNext(60_000);
        assert.ok(event !== undefined, "Each recipient has three durable events");
        assert.equal(event.consumerId, consumerId, "Events never cross the consumer boundary");
        observed.push({
          kind: event.kind,
          accountRevision: event.accountRevision,
          securityEpoch: event.securityEpoch,
          attachmentGeneration: event.attachmentGeneration,
        });
        assert.equal(await outbox.acknowledge(event), true);
      }
      // DB timestamp ties may deliver revisions in a different order.
      // Recipients consume idempotently and enforce their own highest revision.
      observed.sort((left, right) => {
        if (left.accountRevision === right.accountRevision) {
          return 0;
        }
        return left.accountRevision < right.accountRevision ? -1 : 1;
      });
      assert.deepEqual(observed, [
        {
          kind: "account.attached",
          accountRevision: 1n,
          securityEpoch: 1n,
          attachmentGeneration: 1n,
        },
        {
          kind: "account.eligibility-changed",
          accountRevision: 2n,
          securityEpoch: 2n,
          attachmentGeneration: 1n,
        },
        {
          kind: "account.eligibility-changed",
          accountRevision: 3n,
          securityEpoch: 2n,
          attachmentGeneration: 1n,
        },
      ]);
      assert.equal(await outbox.claimNext(60_000), undefined);
      const current = await accounts.api.getAccountStatus(
        workload(consumerId),
        admitted.status.account,
      );
      assert.equal(current.accountRevision, 3n);
      assert.equal(current.securityEpoch, 2n, "Enable never clears the prior revocation fence");
    }
  });
}
