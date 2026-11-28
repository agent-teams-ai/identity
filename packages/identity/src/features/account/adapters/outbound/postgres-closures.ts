import type { Pool } from "pg";
import type { AccountClosureStore } from "../../application/ports/account-closure.js";
import type { ClosureManifestItem, ClosureReport } from "../../application/ports/account-outbox.js";
import { milliseconds } from "./postgres-codecs.js";

export async function listClosureItems(
  pool: Pool,
  consumerId: string,
  status: "pending" | "repair-required",
  page: { readonly limit: number; readonly afterAccountId: string | undefined },
): Promise<readonly ClosureManifestItem[]> {
  const { limit, afterAccountId } = page;
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
    WHERE item.consumer_id = $1 AND item.status = $4
      AND ($2::uuid IS NULL OR item.account_id > $2::uuid)
    ORDER BY item.account_id
    LIMIT $3`,
    [consumerId, afterAccountId ?? null, limit, status],
  );
  return result.rows.map((row) => ({
    consumerId,
    accountId: row.account_id,
    authorityIncarnation: row.authority_incarnation,
    closureRevision: BigInt(row.closure_revision),
    participantGeneration: BigInt(row.participant_generation),
  }));
}

/** Only the original internal trusted worker may omit a credential deadline. */
export async function reportClosureItem(
  pool: Pool,
  consumerId: string,
  report: ClosureReport,
  validBeforeMs?: number,
): Promise<boolean> {
  if (report.consumerId !== consumerId) {
    return false;
  }
  if (
    !["not-provisioned", "erased", "retained-by-policy", "repair-required"].includes(report.outcome)
  ) {
    throw new TypeError("Invalid closure outcome");
  }
  // No retention class, obligation and owner evidence has been qualified yet.
  if (
    report.outcome === "retained-by-policy" ||
    report.closureRevision <= 0n ||
    report.participantGeneration <= 0n
  ) {
    return false;
  }
  if (validBeforeMs !== undefined && (!Number.isSafeInteger(validBeforeMs) || validBeforeMs <= 0)) {
    return false;
  }
  const result = await pool.query<{ readonly account_id: string }>(
    // The expiry comparison depends on the materialized, already-locked row.
    // A contended receipt returns false; no expired authority waits into a write.
    `WITH locked AS MATERIALIZED (
      SELECT item.account_id, item.consumer_id, item.closure_revision,
        item.participant_generation, item.status, $7::bigint AS valid_before_ms
      FROM identity_closure_participants AS item
      JOIN identity_accounts AS account ON account.account_id = item.account_id
        AND account.eligibility = 'closed' AND account.revision = item.closure_revision
        AND account.authority_incarnation = $6
      WHERE item.consumer_id = $1 AND item.account_id = $2
      FOR UPDATE OF item SKIP LOCKED
    )
    UPDATE identity_closure_participants AS item
    SET status = $5
    FROM locked
    WHERE item.consumer_id = locked.consumer_id AND item.account_id = locked.account_id
      AND locked.closure_revision = $3 AND locked.participant_generation = $4
      AND locked.status IN ('pending', $5)
      AND (locked.valid_before_ms IS NULL OR locked.valid_before_ms >
        floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint)
    RETURNING item.account_id`,
    [
      consumerId,
      report.accountId,
      report.closureRevision.toString(),
      report.participantGeneration.toString(),
      report.outcome,
      report.authorityIncarnation,
      validBeforeMs ?? null,
    ],
  );
  return result.rows.length === 1;
}

export function createPostgresClosureStore(pool: Pool): AccountClosureStore {
  return {
    list: async (consumerId, state, page) => {
      const items = await listClosureItems(pool, consumerId, state, {
        limit: page.limit,
        afterAccountId: page.afterAccountId === "" ? undefined : page.afterAccountId,
      });
      // Observe after the bounded read, including any pool or database wait.
      const observation = await pool.query<{ readonly now_ms: string }>(
        "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now_ms",
      );
      const row = observation.rows[0];
      if (row === undefined) {
        throw new Error("Closure observation is unavailable");
      }
      return { items, observedAtMs: milliseconds(row.now_ms) };
    },
    report: (report, validBeforeMs) =>
      reportClosureItem(pool, report.consumerId, report, validBeforeMs),
  };
}
