import type { AccountOutboxDelivery, ClaimedAccountEvent } from "../ports/account-outbox.js";

/**
 * One finite at-least-once dispatch. The caller owns scheduling and the
 * recipient-specific transport. An external delivery may succeed even if its
 * acknowledgement is lost, so recipients must deduplicate by eventId and
 * enforce the account revision and attachment/security epochs themselves.
 */
export async function deliverAccountEvent(
  outbox: AccountOutboxDelivery,
  deliver: (event: ClaimedAccountEvent) => Promise<void>,
  leaseMs: number,
): Promise<"empty" | "acknowledged"> {
  const event = await outbox.claimNext(leaseMs);
  if (event === undefined) {
    return "empty";
  }
  try {
    await deliver(event);
  } catch {
    // No acknowledgement: an owned lease can expire and be redelivered.
    // Do not expose potentially sensitive downstream errors.
    throw new Error("Identity consumer delivery failed");
  }
  // A database error can mean the acknowledgement committed but its response was lost.
  // Never claim success or expose storage details when settlement is uncertain.
  const acknowledged = await outbox.acknowledge(event).catch(() => false);
  if (!acknowledged) {
    throw new Error("Identity consumer acknowledgement uncertain");
  }
  return "acknowledged";
}
