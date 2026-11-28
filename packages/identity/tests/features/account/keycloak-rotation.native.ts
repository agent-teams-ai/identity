import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { decodeProtectedHeader } from "jose";
import { AuthenticationFailure } from "../../../src/features/account/application/ports/authentication.js";
import { createKeycloakAuthentication } from "../../../src/features/account/adapters/inbound/keycloak-authentication.js";
import {
  authorize,
  exchangeCode,
  nativeConfiguration,
  requiredToken,
  tokenRequest,
} from "./keycloak-browser-fixture.js";

const configuration = nativeConfiguration();
const issuer = new URL(configuration.issuer);
assert.equal(
  issuer.href,
  "http://127.0.0.1:18080/realms/identity-test",
  "Disposable TEST realm only",
);
const signal = AbortSignal.timeout(55_000);
const adapter = createKeycloakAuthentication({
  issuer: configuration.issuer,
  authorityId: "keycloak-test",
  authorityIncarnation: "keycloak-test-v1",
  clients: [
    {
      kind: "human",
      clientId: configuration.humanClientId,
      consumerId: "gettok",
      providerControlPolicyId: "gettok-ordinary-login",
      policyVersion: "1",
    },
  ],
});

async function issue(): Promise<string> {
  const response = await exchangeCode(configuration, await authorize(configuration));
  assert.equal(response.status, 200, "Actual provider issues the PKCE credential");
  return requiredToken(await response.json(), "access_token");
}

async function administrator(): Promise<string> {
  const id = process.env.KC_BOOTSTRAP_ADMIN_CLIENT_ID;
  const secret = process.env.KC_BOOTSTRAP_ADMIN_CLIENT_SECRET;
  assert.ok(
    id !== undefined && id.length > 0 && secret !== undefined && secret.length > 0,
    "Launcher supplies disposable admin credentials",
  );
  const response = await tokenRequest(
    { ...configuration, issuer: issuer.origin + "/realms/master" },
    id,
    secret,
    { grant_type: "client_credentials" },
  );
  assert.equal(response.status, 200, "Disposable bootstrap admin grant succeeds");
  return requiredToken(await response.json(), "access_token");
}

async function nextPriority(accessToken: string, oldKid: string): Promise<number> {
  const response = await fetch(issuer.origin + "/admin/realms/identity-test/keys", {
    headers: { authorization: "Bearer " + accessToken },
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  });
  assert.equal(response.status, 200, "Actual realm exposes public key metadata");
  const metadata: unknown = await response.json();
  assert.ok(
    typeof metadata === "object" && metadata !== null && "active" in metadata && "keys" in metadata,
  );
  assert.ok(
    typeof metadata.active === "object" && metadata.active !== null && "RS256" in metadata.active,
  );
  assert.equal(metadata.active.RS256, oldKid, "Original token uses the actual active provider key");
  assert.ok(Array.isArray(metadata.keys) && metadata.keys.length > 0 && metadata.keys.length < 16);
  const keys: readonly unknown[] = metadata.keys;
  let priority = 0;
  for (const key of keys) {
    assert.ok(
      typeof key === "object" &&
        key !== null &&
        "providerPriority" in key &&
        typeof key.providerPriority === "number" &&
        Number.isSafeInteger(key.providerPriority) &&
        Math.abs(key.providerPriority) < 1_000_000,
    );
    priority = Math.max(priority, key.providerPriority);
  }
  return priority + 1;
}

async function rotate(accessToken: string, priority: number): Promise<void> {
  const response = await fetch(issuer.origin + "/admin/realms/identity-test/components", {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
    headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
    body: JSON.stringify({
      name: "native-test-rsa-rotation",
      providerId: "rsa-generated",
      providerType: "org.keycloak.keys.KeyProvider",
      config: {
        priority: [String(priority)],
        enabled: ["true"],
        active: ["true"],
        algorithm: ["RS256"],
        keySize: ["2048"],
      },
    }),
  });
  assert.equal(response.status, 201, "Keycloak creates its own replacement signing key");
  await response.body?.cancel();
}

const oldToken = await issue();
const original = await adapter.authenticate(oldToken, signal);
assert.ok(original.kind === "human");
const warmedAt = performance.now();
const oldKid = decodeProtectedHeader(oldToken).kid;
assert.ok(typeof oldKid === "string" && oldKid.length > 0);
const adminToken = await administrator();
await rotate(adminToken, await nextPriority(adminToken, oldKid));
const newToken = await issue();
const newKid = decodeProtectedHeader(newToken).kid;
assert.ok(
  typeof newKid === "string" && newKid.length > 0 && newKid !== oldKid,
  "Actual provider signs with a different key",
);
assert.deepEqual(
  await adapter.authenticate(oldToken, signal),
  original,
  "Original credential survives activation of the new key",
);

// The production verifier retains its real 30-second unknown-kid cooldown.
// Keep one warm instance; never reset its cache or replace the system clock.
for (;;) {
  signal.throwIfAborted();
  try {
    const rotated = await adapter.authenticate(newToken, signal);
    assert.ok(rotated.kind === "human");
    assert.equal(rotated.subject, original.subject);
    assert.equal(rotated.proof.profile, "provider-session-control-v1");
    break;
  } catch (error) {
    if (!(error instanceof AuthenticationFailure && error.reason === "UNAUTHENTICATED")) {
      throw error;
    }
  }
  assert.deepEqual(await adapter.authenticate(oldToken, signal), original);
  await delay(1_000, undefined, { signal });
}
assert.deepEqual(
  await adapter.authenticate(oldToken, signal),
  original,
  "Refreshed issuer keys still verify the original unexpired token",
);

const [header, payload, signature] = newToken.split(".");
assert.ok(header !== undefined && payload !== undefined && signature !== undefined);
const unknownHeader = Buffer.from(
  JSON.stringify({ ...decodeProtectedHeader(newToken), kid: "native-rotation-unknown-kid" }),
).toString("base64url");
for (const token of [
  `${unknownHeader}.${payload}.${signature}`,
  `${header}.${payload}.AA`,
  "malformed.native.token",
]) {
  await assert.rejects(
    adapter.authenticate(token, signal),
    (error: unknown) =>
      error instanceof AuthenticationFailure && error.reason === "UNAUTHENTICATED",
  );
}
process.stdout.write(
  `${JSON.stringify({
    nativeSigningKeyOverlap: "passed",
    warmVerifierRefresh: "passed",
    warmVerifierMilliseconds: Math.round(performance.now() - warmedAt),
    unknownAndTamperedTokens: "denied",
    keyRetirement: "not-qualified",
  })}\n`,
);
