import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test, type TestContext } from "node:test";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createKeycloakAuthentication } from "../../../src/features/account/adapters/inbound/keycloak-authentication.js";
import { AuthenticationFailure } from "../../../src/features/account/application/ports/authentication.js";

const serveKeys = async (context: TestContext, body: string): Promise<string> => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  context.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => {
      server.close(() => {
        resolve();
      });
    });
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  return `http://127.0.0.1:${address.port}/realms/fixture`;
};

const signingFixture = async (context: TestContext) => {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const publicJwk = await exportJWK(publicKey);
  const issuer = await serveKeys(
    context,
    JSON.stringify({ keys: [{ ...publicJwk, kid: "test-key", use: "sig", alg: "RS256" }] }),
  );
  const nowMs = Math.floor(Date.now() / 1_000) * 1_000;
  const seconds = nowMs / 1_000;
  const adapter = createKeycloakAuthentication({
    issuer,
    authorityId: "test-authority",
    authorityIncarnation: "test-incarnation",
    now: () => nowMs,
    clients: [
      {
        kind: "human",
        clientId: "gettok-bff",
        consumerId: "gettok",
        providerControlPolicyId: "gettok-ordinary-login",
        policyVersion: "1",
      },
      { kind: "workload", clientId: "gettok-workload", consumerId: "gettok" },
    ],
  });
  const sign = (overrides: Record<string, unknown> = {}) =>
    new SignJWT({
      iss: issuer,
      sub: "exact-provider-subject",
      aud: "identity-api",
      azp: "gettok-bff",
      typ: "Bearer",
      iat: seconds,
      exp: seconds + 300,
      sid: "provider-session",
      auth_time: seconds - 30,
      scope: "openid identity.resolve:self",
      ...overrides,
    })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .sign(privateKey);
  return { adapter, sign, nowMs, seconds };
};

await test("Keycloak token boundary rejects wrong authority kind scope and age", async (context) => {
  const { adapter, sign, seconds } = await signingFixture(context);
  const cases: readonly [string, Record<string, unknown>][] = [
    ["wrong issuer", { iss: "https://untrusted.example.invalid/realms/fixture" }],
    ["wrong audience", { aud: "gettok-bff" }],
    ["ID token", { typ: "ID" }],
    ["unadmitted client", { azp: "another-product" }],
    ["workload cannot resolve self", { azp: "gettok-workload" }],
    ["missing self permission", { scope: "openid" }],
    ["missing expiry", { exp: undefined }],
    ["expired credential", { exp: seconds }],
    ["unbounded lifetime", { exp: seconds + 301 }],
    ["future issuance", { iat: seconds + 6, exp: seconds + 300 }],
    ["missing provider session", { sid: undefined }],
    ["missing authentication time", { auth_time: undefined }],
    ["future authentication", { auth_time: seconds + 6 }],
    ["expired flow control", { auth_time: seconds - 8 * 60 * 60 }],
  ];
  for (const [name, overrides] of cases) {
    await context.test(name, async () => {
      await assert.rejects(
        adapter.authenticate(await sign(overrides), new AbortController().signal),
        (error: unknown) =>
          error instanceof AuthenticationFailure && error.reason === "UNAUTHENTICATED",
      );
    });
  }
});

await test("Keycloak proof stays ordinary and expires with its original human credential", async (context) => {
  const { adapter, sign, nowMs } = await signingFixture(context);
  const actor = await adapter.authenticate(
    await sign({ acr: "2", amr: ["hwk", "mfa"], mfaEnabled: true }),
    new AbortController().signal,
  );
  assert.ok(actor.kind === "human");
  assert.equal(actor.authoritySessionId, "provider-session");
  assert.equal(actor.signedInAtMs, nowMs - 30_000);
  assert.equal(actor.proof.profile, "provider-session-control-v1");
  assert.equal(actor.proof.scope, "gettok-ordinary-login");
  assert.equal(actor.proof.validUntilMs, nowMs + 300_000);
  assert.equal(actor.credentialExpiresAtMs, actor.proof.validUntilMs);
  const workload = await adapter.authenticate(
    await sign({
      azp: "gettok-workload",
      sub: "service-account-subject",
      scope: "identity.status:read",
      sid: undefined,
      auth_time: undefined,
    }),
    new AbortController().signal,
  );
  assert.deepEqual(workload, {
    kind: "workload",
    clientId: "gettok-workload",
    consumerId: "gettok",
    credentialExpiresAtMs: nowMs + 300_000,
  });
});
