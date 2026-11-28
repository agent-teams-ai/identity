import { validateReference } from "../../domain/admission-policy.js";
import { validateTerminalAuthority } from "../../domain/authority.js";
import type { VerifiedTerminalWorkload } from "../../domain/authority.js";
import { AccountFailure } from "../../domain/model.js";
import type { AccountClosureDependencies, ClosureReceipt } from "../ports/account-closure.js";

export async function reportClosureReceipt(
  deps: AccountClosureDependencies,
  actor: VerifiedTerminalWorkload,
  receipt: ClosureReceipt,
): Promise<void> {
  validateTerminalAuthority(actor);
  const item = receipt.participant;
  validateReference(item);
  if (
    item.manifestVersion !== 1 ||
    item.closureRevision <= 0n ||
    item.closureRevision > 9_223_372_036_854_775_807n ||
    item.participantGeneration <= 0n ||
    item.participantGeneration > 9_223_372_036_854_775_807n ||
    !["not-provisioned", "erased", "repair-required"].includes(receipt.outcome)
  ) {
    throw new AccountFailure("INVALID_ARGUMENT");
  }
  const validBeforeMs = actor.credentialExpiresAtMs - deps.maximumClockSkewMs;
  if (!Number.isSafeInteger(validBeforeMs) || validBeforeMs <= 0) {
    throw new AccountFailure("UNAUTHENTICATED");
  }
  const accepted = await deps.store.report(
    { ...item, consumerId: actor.consumerId, outcome: receipt.outcome },
    validBeforeMs,
  );
  if (!accepted) {
    // Unknown, foreign, stale, expired and conflicting receipts share one refusal.
    throw new AccountFailure("PERMISSION_DENIED");
  }
}
