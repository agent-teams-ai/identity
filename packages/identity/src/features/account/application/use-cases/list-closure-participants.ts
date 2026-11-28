import { requireLiveCredential } from "../../domain/admission-policy.js";
import { validateTerminalAuthority } from "../../domain/authority.js";
import type { VerifiedTerminalWorkload } from "../../domain/authority.js";
import { AccountFailure } from "../../domain/model.js";
import type {
  AccountClosureDependencies,
  ClosurePage,
  ClosurePageRequest,
} from "../ports/account-closure.js";

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
  validateTerminalAuthority(actor);
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
