import { assemblyFor } from '@get-modular/assembly';
import { createAccountGroup } from '../features/account/composition/account.group.js';
import type { AccountGroupOptions } from '../features/account/composition/account.group.js';
import type { IdentityCapabilities } from './identity.contracts.js';
import { identityEntry } from './identity.module.js';

export async function createIdentity(options: AccountGroupOptions, signal: AbortSignal) {
  const result = await assemblyFor<IdentityCapabilities>().prepare({
    profileId: 'identity.service.v1', modules: [createAccountGroup(options), identityEntry], roots: { identity: identityEntry },
  });
  if (result.status !== 'prepared') throw new Error(`Identity composition rejected: ${result.error.code}`);
  const outcome = await result.prepared.run({ signal });
  if (outcome.status !== 'succeeded') throw new Error(`Identity composition did not start: ${outcome.status}`);
  return outcome.roots.identity;
}
