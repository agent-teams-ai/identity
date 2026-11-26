import type { createIdentity } from '@agent-teams/identity-core';

type AuthenticationConfig = Parameters<typeof createIdentity>[0]['authentication'];
type Client = AuthenticationConfig['clients'][number];

export interface ServerConfiguration {
  readonly databaseUrl: string;
  readonly host: string;
  readonly port: number;
  readonly authentication: AuthenticationConfig;
}

function required(value: string | undefined, name: string): string {
  if (value === undefined || value.length === 0 || value !== value.trim()) {
    throw new TypeError(`Required configuration: ${name}`);
  }
  return value;
}

function clientString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 256 || /\s/u.test(value)) {
    throw new TypeError('Invalid admitted client field');
  }
  return value;
}

function client(value: unknown): Client {
  if (value === null || typeof value !== 'object' || !('kind' in value) || !('clientId' in value) || !('consumerId' in value)) {
    throw new TypeError('Invalid admitted client');
  }
  const base = { clientId: clientString(value.clientId), consumerId: clientString(value.consumerId) };
  if (value.kind === 'workload') return { ...base, kind: 'workload' };
  if (value.kind !== 'human' || !('providerControlPolicyId' in value) || !('policyVersion' in value) || value.policyVersion !== '1') {
    throw new TypeError('Unsupported human admission policy');
  }
  return { ...base, kind: 'human', providerControlPolicyId: clientString(value.providerControlPolicyId), policyVersion: '1' };
}

function clients(raw: string): readonly Client[] {
  if (Buffer.byteLength(raw, 'utf8') > 16_384) throw new TypeError('Admitted clients configuration is too large');
  const values: unknown = JSON.parse(raw);
  if (!Array.isArray(values) || values.length === 0 || values.length > 32) throw new TypeError('Invalid admitted clients');
  return values.map((value: unknown) => client(value));
}

function isLoopback(url: URL): boolean {
  return url.hostname === '127.0.0.1' || url.hostname === '[::1]';
}

function validateEndpoints(databaseUrl: string, issuer: string, testMode: boolean): void {
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) ||
    (!isLoopback(database) && database.searchParams.get('sslmode') !== 'verify-full')) {
    throw new TypeError('PostgreSQL requires a supported URL and verified TLS outside loopback');
  }
  const authority = new URL(issuer);
  if (authority.protocol !== 'https:' && !(testMode && isLoopback(authority) && authority.protocol === 'http:')) {
    throw new TypeError('Keycloak requires HTTPS outside explicit loopback TEST mode');
  }
}

export function serverConfiguration(environment: Readonly<Record<string, string | undefined>>): ServerConfiguration {
  const databaseUrl = required(environment.IDENTITY_DATABASE_URL, 'IDENTITY_DATABASE_URL');
  const issuer = required(environment.IDENTITY_ISSUER, 'IDENTITY_ISSUER');
  const testMode = environment.IDENTITY_TEST_MODE === 'true';
  validateEndpoints(databaseUrl, issuer, testMode);
  const port = Number(environment.IDENTITY_PORT ?? '8080');
  if (!Number.isSafeInteger(port) || port < (testMode ? 0 : 1) || port > 65_535) throw new TypeError('Invalid port');
  return {
    databaseUrl, host: environment.IDENTITY_HOST ?? '127.0.0.1', port,
    authentication: {
      issuer, authorityId: 'keycloak-primary',
      authorityIncarnation: required(environment.IDENTITY_AUTHORITY_INCARNATION, 'IDENTITY_AUTHORITY_INCARNATION'),
      clients: clients(required(environment.IDENTITY_CLIENTS_JSON, 'IDENTITY_CLIENTS_JSON')),
    },
  };
}
