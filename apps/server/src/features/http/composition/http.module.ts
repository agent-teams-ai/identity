import { implement } from '@get-modular/assembly';
import { scoped } from '@get-modular/resources';
import { createFastifyHost, type HttpHostOptions } from '../adapters/inbound/fastify-host.js';
import { HttpHostContract, type HttpCapabilities } from './http.contracts.js';
import { httpDeclaration } from './http.declaration.js';

export function createHttpEntry(options: HttpHostOptions) {
  return implement<HttpCapabilities>()(httpDeclaration, scoped('http', async (_dependencies, context) => {
    const http = await context.resources.setup({
      name: 'fastify-connect',
      setup: async () => createFastifyHost(options),
      cleanup: async (value) => value.close(),
    });
    return { instance: http, capabilities: { [HttpHostContract.id]: http } };
  }));
}
