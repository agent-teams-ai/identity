import type { StatusEvidence } from '../../domain/admission.js';
import { statusOf, validateReference } from '../../domain/admission-policy.js';
import { AccountFailure } from '../../domain/model.js';
import type { AccountReference } from '../../domain/model.js';
import type { AccountDependencies } from '../ports/account-api.js';
import type { VerifiedWorkload } from '../ports/authentication.js';

export async function getAccountStatus(deps: AccountDependencies, input: {
  readonly actor: VerifiedWorkload; readonly account: AccountReference;
}): Promise<StatusEvidence> {
  validateReference(input.account);
  return deps.store.transaction(async (tx) => {
    const account = await tx.lockAccount(input.account.accountId);
    if (!account || account.authorityIncarnation !== input.account.authorityIncarnation) throw new AccountFailure('PERMISSION_DENIED');
    const attachment = await tx.findAttachment(account.accountId, input.actor.consumerId);
    if (!attachment || attachment.state !== 'active') throw new AccountFailure('PERMISSION_DENIED');
    return statusOf({ account, attachment, observedAtMs: await tx.observeTimeMs(),
      credentialExpiresAtMs: input.actor.credentialExpiresAtMs, policy: deps.policy });
  });
}
