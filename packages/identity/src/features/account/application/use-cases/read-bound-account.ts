import { AccountFailure } from '../../domain/model.js';
import type { Account } from '../../domain/model.js';
import type { AccountTransaction } from '../ports/account-store.js';
import type { VerifiedHuman } from '../ports/authentication.js';

export async function readBoundAccount(tx: AccountTransaction, actor: VerifiedHuman): Promise<Account> {
  const binding = await tx.findBinding(actor);
  if (!binding) throw new AccountFailure('PERMISSION_DENIED');
  if (binding.authorityIncarnation !== actor.authorityIncarnation || binding.state !== 'active') throw new AccountFailure('REPAIR_REQUIRED');
  const account = await tx.lockAccount(binding.accountId);
  if (!account || account.authorityIncarnation !== actor.authorityIncarnation) throw new AccountFailure('REPAIR_REQUIRED');
  return account;
}
