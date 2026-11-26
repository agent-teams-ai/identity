import { validatePolicy } from '../../domain/admission-policy.js';
import type { AccountApi, AccountAdministration, AccountDependencies } from '../../application/ports/account-api.js';
import { getAccountStatus } from '../../application/use-cases/get-account-status.js';
import { getSelfStatus } from '../../application/use-cases/get-self-status.js';
import { resolveSelf } from '../../application/use-cases/resolve-self.js';
import { transitionAccount } from '../../application/use-cases/transition-account.js';

export function createAccounts(deps: AccountDependencies): {
  readonly api: AccountApi; readonly administration: AccountAdministration;
} {
  validatePolicy(deps.policy);
  return {
    api: {
      resolveSelf: (actor, idempotencyKey) => resolveSelf(deps, { actor, idempotencyKey }),
      getSelfStatus: (actor) => getSelfStatus(deps, actor),
      getAccountStatus: (actor, account) => getAccountStatus(deps, { actor, account }),
    },
    administration: { transition: (account, action, expectedRevision) => transitionAccount(deps, { account, action, expectedRevision }) },
  };
}
