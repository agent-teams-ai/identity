import { validateReference } from '../../domain/admission-policy.js';
import { AccountFailure, transitionAccount as applyTransition } from '../../domain/model.js';
import type { AccountReference, AccountTransition } from '../../domain/model.js';
import type { AccountDependencies } from '../ports/account-api.js';

export async function transitionAccount(deps: AccountDependencies, input: {
  readonly account: AccountReference; readonly action: AccountTransition; readonly expectedRevision: bigint;
}): Promise<void> {
  validateReference(input.account);
  return deps.store.transaction(async (tx) => {
    const account = await tx.lockAccount(input.account.accountId);
    if (!account || account.authorityIncarnation !== input.account.authorityIncarnation) throw new AccountFailure('PERMISSION_DENIED');
    const nowMs = await tx.observeTimeMs();
    const updated = applyTransition(account, input.action, input.expectedRevision, nowMs);
    await tx.saveAccount(updated);
    if (input.action === 'close') await tx.captureClosureParticipants(account.accountId, updated.revision, nowMs);
    for (const attachment of await tx.listAttachments(account.accountId)) {
      // Detached cleanup participants retain a separate terminal-purpose manifest.
      if (attachment.state !== 'active') continue;
      await tx.appendEvent({ id: deps.newId(), accountId: account.accountId, consumerId: attachment.consumerId,
        kind: 'account.eligibility-changed', accountRevision: updated.revision,
        securityEpoch: updated.securityEpoch, attachmentGeneration: attachment.generation, observedAtMs: nowMs });
    }
    await tx.appendAudit({ id: deps.newId(), accountId: account.accountId, consumerId: null,
      action: input.action, accountRevision: updated.revision, observedAtMs: nowMs });
  });
}
