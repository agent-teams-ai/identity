import type { Pool } from "pg";
import type {
  AccountOutboxDelivery,
  ClaimedAccountEvent,
  ClosureOutcome,
  PendingClosure,
} from "../../application/ports/account-outbox.js";
import { milliseconds } from "./postgres-codecs.js";

type StoredOutboxEvent = {
  readonly event_id: string;
  readonly account_id: string;
  readonly consumer_id: string;
  readonly kind: ClaimedAccountEvent["kind"];
  readonly account_revision: string;
  readonly security_epoch: string;
  readonly attachment_generation: string;
  readonly observed_at_ms: string;
  readonly claim_generation: string;
  readonly claimed_until_ms: string;
};

const toEvent = (row: StoredOutboxEvent): ClaimedAccountEvent => ({
  eventId: row.event_id,
  accountId: row.account_id,
  consumerId: row.consumer_id,
  kind: row.kind,
  accountRevision: BigInt(row.account_revision),
  securityEpoch: BigInt(row.security_epoch),
  attachmentGeneration: BigInt(row.attachment_generation),
  observedAtMs: milliseconds(row.observed_at_ms),
  claimGeneration: BigInt(row.claim_generation),
  leaseUntilMs: milliseconds(row.claimed_until_ms),
});

async function listPendingClosures(
  pool: Pool,
  consumerId: string,
  limit: number,
  afterAccountId?: string,
): Promise<readonly PendingClosure[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError("Invalid closure page size");
  }
  if (
    afterAccountId !== undefined &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(afterAccountId)
  ) {
    throw new TypeError("Invalid closure cursor");
  }
  const result = await pool.query<{
    readonly account_id: string;
    readonly authority_incarnation: string;
    readonly closure_revision: string;
    readonly participant_generation: string;
  }>(
    `SELECT item.account_id, account.authority_incarnation, item.closure_revision,
      item.participant_generation
    FROM identity_closure_participants AS item
    JOIN identity_accounts AS account ON account.account_id = item.account_id
      AND account.eligibility = 'closed' AND account.revision = item.closure_revision
    WHERE item.consumer_id = $1 AND item.status = 'pending'
      AND ($2::uuid IS NULL OR item.account_id > $2::uuid)
    ORDER BY item.account_id
    LIMIT $3`,
    [consumerId, afterAccountId ?? null, limit],
  );
  return result.rows.map((row) => ({
    consumerId,
    accountId: row.account_id,
    authorityIncarnation: row.authority_incarnation,
    closureRevision: BigInt(row.closure_revision),
    participantGeneration: BigInt(row.participant_generation),
  }));
}

/**
 * The consumer is bound by trusted worker configuration, never by an RPC field.
 * Each statement is atomic; the database clock, not a process clock, owns leases.
 * Concurrent workers may observe events out of order: consumers must enforce the
 * account/attachment revision and epoch fences carried by each event.
 */
export function createPostgresOutboxDelivery(
  pool: Pool,
  consumerId: string,
): AccountOutboxDelivery {
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(consumerId)) {
    throw new TypeError("Invalid trusted outbox consumer");
  }
  return {
    claimNext: async (leaseMs) => {
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 100 || leaseMs > 60_000) {
        throw new RangeError("Invalid outbox lease");
      }
      const result = await pool.query<StoredOutboxEvent>(
        `WITH candidate AS (
          SELECT pending.event_id FROM identity_outbox AS pending
          WHERE pending.consumer_id = $1 AND pending.published_at_ms IS NULL
            AND (pending.claimed_until_ms IS NULL OR pending.claimed_until_ms <=
              floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
            AND EXISTS (
              SELECT 1 FROM identity_consumer_attachments AS attachment
              WHERE attachment.account_id = pending.account_id
                AND attachment.consumer_id = pending.consumer_id
                AND attachment.state = 'active'
                AND attachment.generation = pending.attachment_generation
            )
          ORDER BY pending.observed_at_ms, pending.event_id
          LIMIT 1 FOR UPDATE SKIP LOCKED
        )
        UPDATE identity_outbox AS event
        SET claim_generation = event.claim_generation + 1,
            claimed_until_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint + $2
        FROM candidate
        WHERE event.event_id = candidate.event_id
        RETURNING event.event_id, event.account_id, event.consumer_id, event.kind,
          event.account_revision, event.security_epoch, event.attachment_generation,
          event.observed_at_ms, event.claim_generation, event.claimed_until_ms`,
        [consumerId, leaseMs],
      );
      const row = result.rows[0];
      return row === undefined ? undefined : toEvent(row);
    },
    acknowledge: async (claim) => {
      if (claim.claimGeneration <= 0n) {
        return false;
      }
      const result = await pool.query<{ readonly event_id: string }>(
        `UPDATE identity_outbox
        SET published_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint,
            claimed_until_ms = NULL
        WHERE consumer_id = $1 AND event_id = $2 AND claim_generation = $3
          AND published_at_ms IS NULL
          AND claimed_until_ms > floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
        RETURNING event_id`,
        [consumerId, claim.eventId, claim.claimGeneration.toString()],
      );
      return result.rows.length === 1;
    },
    listPendingClosures: async (limit, afterAccountId) =>
      listPendingClosures(pool, consumerId, limit, afterAccountId),
    reportClosure: async (report) => {
      if (report.consumerId !== consumerId) {
        return false;
      }
      const allowed: readonly ClosureOutcome[] = [
        "not-provisioned",
        "erased",
        "retained-by-policy",
        "repair-required",
      ];
      if (!allowed.includes(report.outcome)) {
        throw new TypeError("Invalid closure outcome");
      }
      if (report.closureRevision <= 0n || report.participantGeneration <= 0n) {
        return false;
      }
      const result = await pool.query<{ readonly account_id: string }>(
        `UPDATE identity_closure_participants AS item
        SET status = $5
        WHERE item.consumer_id = $1 AND item.account_id = $2
          AND item.closure_revision = $3 AND item.participant_generation = $4
          AND item.status = 'pending'
          AND EXISTS (
            SELECT 1 FROM identity_accounts AS account
            WHERE account.account_id = item.account_id AND account.eligibility = 'closed'
              AND account.revision = item.closure_revision
              AND account.authority_incarnation = $6
          )
        RETURNING item.account_id`,
        [
          consumerId,
          report.accountId,
          report.closureRevision.toString(),
          report.participantGeneration.toString(),
          report.outcome,
          report.authorityIncarnation,
        ],
      );
      return result.rows.length === 1;
    },
  };
}
