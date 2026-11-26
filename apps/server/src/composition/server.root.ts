import { assemblyFor } from '@get-modular/assembly';
import { CloseIncompleteError, createScope, type Scope } from '@get-modular/resources';
import { createIdentity } from '@agent-teams/identity-core';
import { Pool } from 'pg';
import { v7 as newId } from 'uuid';
import { createHttpGroup } from '../features/http/composition/http.group.js';
import type { ServerConfiguration } from './configuration.js';
import type { ServerCapabilities } from './server.contracts.js';
import { serverEntry } from './server.module.js';

async function database(scope: Scope, configuration: ServerConfiguration): Promise<Pool> {
  return scope.resources.setup({
    name: 'postgres',
    setup: () => {
      const pool = new Pool({
        connectionString: configuration.databaseUrl,
        max: 8, connectionTimeoutMillis: 2_000, idleTimeoutMillis: 30_000, query_timeout: 4_000,
      });
      pool.on('error', () => process.stderr.write('Identity database idle connection failed\n'));
      return pool;
    },
    cleanup: async (pool) => pool.end(),
  });
}

async function readiness(pool: Pool, scope: Scope): Promise<boolean> {
  if (scope.resources.signal.aborted) return false;
  const result = await pool.query<{ readonly version: number }>('SELECT MAX(version)::integer AS version FROM identity_schema_migrations');
  return result.rows[0]?.version === 1;
}

async function acquireHost(scope: Scope, configuration: ServerConfiguration) {
  const pool = await database(scope, configuration);
  const identity = await createIdentity({
    pool, authentication: configuration.authentication, newId,
    policy: { statusBudgetMs: 60_000, maximumClockSkewMs: 5_000, allowedProofPolicyVersions: ['1'] },
  }, scope.resources.signal);
  const prepared = await assemblyFor<ServerCapabilities>().prepare({
    profileId: 'identity.http.v1',
    modules: [createHttpGroup({ ...identity, ready: async () => readiness(pool, scope), logging: true }), serverEntry],
    roots: { server: serverEntry },
  });
  if (prepared.status !== 'prepared') throw new Error(`Server composition rejected: ${prepared.error.code}`);
  const result = await prepared.prepared.run({ scope, signal: scope.resources.signal });
  if (result.status !== 'succeeded') throw new Error(`Server composition did not start: ${result.status}`);
  return result.roots.server;
}

export async function startServer(configuration: ServerConfiguration) {
  const scope = createScope({ name: 'identity-server', order: 'reverse' });
  try {
    const host = await acquireHost(scope, configuration);
    const address = await host.listen({ host: configuration.host, port: configuration.port });
    return { address, close: async () => scope.control.close() };
  } catch (error) {
    const report = await scope.control.close();
    if (!report.complete) throw new AggregateError([error, new CloseIncompleteError(report)], 'Server startup cleanup is incomplete');
    throw error;
  }
}
