import { requireLiveCredential, validateReference } from "../../domain/admission-policy.js";
import { AccountFailure } from "../../domain/model.js";
import type { VerifiedTerminalWorkload } from "../../domain/authority.js";
import type {
  AccountClosureDependencies,
  ClosurePage,
  ClosurePageRequest,
  ClosureReceipt,
} from "../ports/account-closure.js";

function validateAuthority(actor: VerifiedTerminalWorkload): void {
  if (
    actor.kind !== "terminal-workload" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(actor.consumerId)
  ) {
    throw new AccountFailure("PERMISSION_DENIED");
  }
  if (!Number.isSafeInteger(actor.credentialExpiresAtMs) || actor.credentialExpiresAtMs <= 0) {
    throw new AccountFailure("UNAUTHENTICATED");
  }
}

function validatePage(page: ClosurePageRequest): void {
  if (
    !Number.isSafeInteger(page.limit) ||
    page.limit < 1 ||
    page.limit > 16 ||
    (page.afterAccountId !== "" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(page.afterAccountId))
  ) {
    throw new AccountFailure("INVALID_ARGUMENT");
  }
}

export async function listClosureParticipants(
  deps: AccountClosureDependencies,
  actor: VerifiedTerminalWorkload,
  state: "pending" | "repair-required",
  page: ClosurePageRequest,
): Promise<ClosurePage> {
  validateAuthority(actor);
  validatePage(page);
  const snapshot = await deps.store.list(actor.consumerId, state, page);
  requireLiveCredential(
    actor.credentialExpiresAtMs,
    snapshot.observedAtMs,
    deps.maximumClockSkewMs,
  );
  const participants = snapshot.items.map((item) => {
    if (item.consumerId !== actor.consumerId) {
      throw new Error("Closure store returned an unrelated participant");
    }
    return {
      accountId: item.accountId,
      authorityIncarnation: item.authorityIncarnation,
      closureRevision: item.closureRevision,
      participantGeneration: item.participantGeneration,
      manifestVersion: 1 as const,
    };
  });
  return {
    participants,
    nextAfterAccountId:
      participants.length === page.limit ? (participants.at(-1)?.accountId ?? "") : "",
  };
}

export async function reportClosureReceipt(
  deps: AccountClosureDependencies,
  actor: VerifiedTerminalWorkload,
  receipt: ClosureReceipt,
): Promise<void> {
  validateAuthority(actor);
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
