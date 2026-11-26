import { createRemoteJWKSet, customFetch, type FetchImplementation } from 'jose';
import { AuthenticationFailure } from '../../application/ports/authentication.js';

const MAX_JWKS_BYTES = 65_536;

const readBoundedBody = async (response: Response): Promise<Buffer> => {
  if (response.status !== 200 || response.body === null) {
    await response.body?.cancel();
    throw new AuthenticationFailure('UNAVAILABLE');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      length += result.value.byteLength;
      if (length > MAX_JWKS_BYTES) {
        await reader.cancel();
        throw new AuthenticationFailure('UNAVAILABLE');
      }
      chunks.push(result.value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
};

const requireBoundedKeys = (body: Buffer): void => {
  const document: unknown = JSON.parse(body.toString('utf8'));
  if (typeof document !== 'object' || document === null || !('keys' in document) ||
      !Array.isArray(document.keys) || document.keys.length === 0 || document.keys.length > 16) {
    throw new AuthenticationFailure('UNAVAILABLE');
  }
};

const boundedFetch: FetchImplementation = async (url, options) => {
  const response = await fetch(url, { ...options, redirect: 'error' });
  const body = await readBoundedBody(response);
  requireBoundedKeys(body);
  return new Response(new Uint8Array(body), { status: 200, headers: { 'content-type': 'application/json' } });
};

/** Only the configured issuer supplies keys; jose owns selection and cryptography. */
export const createKeycloakJwks = (issuer: string) =>
  createRemoteJWKSet(new URL(`${issuer}/protocol/openid-connect/certs`), {
    timeoutDuration: 3_000, cooldownDuration: 30_000, cacheMaxAge: 300_000,
    [customFetch]: boundedFetch,
  });
