import { declareModule } from '@get-modular/assembly';
import { AccountApiContract, AccountAuthenticationContract } from './account.contracts.js';

export const accountDeclaration = declareModule({
  moduleId: 'identity/account', implementationId: 'identity/account-postgres-keycloak',
  owner: { authority: 'agent-teams.identity', path: ['account'] },
  provides: [AccountApiContract.provide(), AccountAuthenticationContract.provide()], slots: [],
});
