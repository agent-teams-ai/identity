import { declareModule } from '@get-modular/assembly';
import { required } from '@get-modular/core';
import { HttpHostContract } from '../features/http/composition/http.contracts.js';

export const serverDeclaration = declareModule({
  moduleId: 'identity/server', implementationId: 'identity/server-static',
  owner: { authority: 'agent-teams.identity', path: ['server'] },
  provides: [], slots: [HttpHostContract.slot('http', required())],
});
