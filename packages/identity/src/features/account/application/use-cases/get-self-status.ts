import type { StatusEvidence } from "../../domain/admission.js";
import { statusOf } from "../../domain/admission-policy.js";
import { AccountFailure } from "../../domain/model.js";
import type { AccountDependencies } from "../ports/account-api.js";
import type { VerifiedHuman } from "../ports/authentication.js";
import { readBoundAccount } from "./read-bound-account.js";

export async function getSelfStatus(
  deps: AccountDependencies,
  actor: VerifiedHuman,
): Promise<StatusEvidence> {
  return deps.store.transaction(async (tx) => {
    const account = await readBoundAccount(tx, actor);
    const attachment = await tx.findAttachment(account.accountId, actor.consumerId);
    if (!attachment || attachment.state !== "active") {
      throw new AccountFailure("REATTACHMENT_REQUIRED");
    }
    return statusOf({
      account,
      attachment,
      observedAtMs: await tx.observeTimeMs(),
      credentialExpiresAtMs: actor.credentialExpiresAtMs,
      policy: deps.policy,
    });
  });
}
