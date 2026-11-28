import type { Pool } from "pg";
import type {
  AccountOutboxDelivery,
  ClaimedAccountEvent,
} from "../../application/ports/account-outbox.js";
import { milliseconds } from "./postgres-codecs.js";
import { listClosureItems, reportClosureItem } from "./postgres-closures.js";

type StoredOutboxEvent = {
  readonly event_id: string;
  readonly account_id: string;
  readonly authority_incarnation: string;
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
  authorityIncarnation: row.authority_incarnation,
  consumerId: row.consumer_id,
  kind: row.kind,
  accountRevision: BigInt(row.account_revision),
  securityEpoch: BigInt(row.security_epoch),
  attachmentGeneration: BigInt(row.attachment_generation),
  observedAtMs: milliseconds(row.observed_at_ms),
  claimGeneration: BigInt(row.claim_generation),
  leaseUntilMs: milliseconds(row.claimed_until_ms),
});

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
          SELECT pending.event_id, account.authority_incarnation
          FROM identity_outbox AS pending
          JOIN identity_accounts AS account ON account.account_id = pending.account_id
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
          LIMIT 1 FOR UPDATE OF pending SKIP LOCKED
        )
        UPDATE identity_outbox AS event
        SET claim_generation = event.claim_generation + 1,
            claimed_until_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint + $2
        FROM candidate
        WHERE event.event_id = candidate.event_id
        RETURNING event.event_id, event.account_id, candidate.authority_incarnation,
          event.consumer_id, event.kind,
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
        // Lock before checking the database deadline. A plain UPDATE can test its
        // WHERE before waiting on a row-only locker, without rechecking on release.
        `WITH locked AS MATERIALIZED (
          SELECT event_id, claim_generation, claimed_until_ms, published_at_ms
          FROM identity_outbox
          WHERE consumer_id = $1 AND event_id = $2
          FOR UPDATE SKIP LOCKED
        )
        UPDATE identity_outbox AS event
        SET published_at_ms = floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint,
            claimed_until_ms = NULL
        FROM locked
        WHERE event.event_id = locked.event_id AND locked.claim_generation = $3
          AND locked.published_at_ms IS NULL
          AND locked.claimed_until_ms > floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint
        RETURNING event.event_id`,
        [consumerId, claim.eventId, claim.claimGeneration.toString()],
      );
      return result.rows.length === 1;
    },
    listPendingClosures: async (limit, afterAccountId) =>
      listClosureItems(pool, consumerId, "pending", { limit, afterAccountId }),
    listRepairRequiredClosures: async (limit, afterAccountId) =>
      listClosureItems(pool, consumerId, "repair-required", { limit, afterAccountId }),
    reportClosure: (report) => reportClosureItem(pool, consumerId, report),
  };
}
