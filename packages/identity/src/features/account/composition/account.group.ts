import { group } from '@get-modular/assembly';
import { createAccountEntry } from './account.module.js';
import type { AccountGroupOptions } from './account.module.js';
export type { AccountGroupOptions } from './account.module.js';

export function createAccountGroup(options: AccountGroupOptions) {
  const accountEntry = createAccountEntry(options);
  return group('account', [
    accountEntry,
  ]);
}
