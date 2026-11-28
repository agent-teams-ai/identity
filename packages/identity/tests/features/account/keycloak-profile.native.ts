import assert from "node:assert/strict";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { AuthenticationFailure } from "../../../src/features/account/application/ports/authentication.js";
import { createKeycloakAuthentication } from "../../../src/features/account/adapters/inbound/keycloak-authentication.js";
import {
  authorize,
  authorizationUrl,
  exchangeCode,
  HUMAN_CLIENT,
  nativeConfiguration,
  requiredToken,
  tokenRequest,
  WORKLOAD_CLIENT,
  type NativeKeycloakConfiguration,
} from "./keycloak-browser-fixture.js";

const verifyUserInfo = async (
  configuration: NativeKeycloakConfiguration,
  accessToken: string,
  subject: string,
): Promise<void> => {
  const response = await fetch(`${configuration.issuer}/protocol/openid-connect/userinfo`, {
    headers: { authorization: `Bearer ${accessToken}` },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  assert.equal(
    response.status,
    200,
    "Native userinfo is available for the actual human credential",
  );
  const profile: unknown = await response.json();
  assert.ok(
    typeof profile === "object" && profile !== null && "sub" in profile && profile.sub === subject,
    "Userinfo binds to the verified ID/access subject",
  );
  assert.ok(
    "email" in profile &&
      profile.email === "fixture-person@example.invalid" &&
      "email_verified" in profile &&
      profile.email_verified === true,
    "Native verified contact profile is present",
  );
};

const verifyHuman = async (
  configuration: NativeKeycloakConfiguration,
  adapter: ReturnType<typeof createKeycloakAuthentication>,
): Promise<void> => {
  const authorization = await authorize(configuration);
  const response = await exchangeCode(configuration, authorization);
  assert.equal(response.status, 200, "Native code exchange succeeds");
  const tokens: unknown = await response.json();
  const accessToken = requiredToken(tokens, "access_token");
  const idToken = requiredToken(tokens, "id_token");
  const actor = await adapter.authenticate(accessToken, new AbortController().signal);
  assert.ok(actor.kind === "human", "Native BFF credential remains a human actor");
  assert.equal(actor.proof.profile, "provider-session-control-v1");
  assert.equal(actor.proof.scope, "gettok-ordinary-login");
  assert.equal(actor.proof.validUntilMs, actor.credentialExpiresAtMs);
  assert.ok(actor.authoritySessionId.length > 0 && actor.signedInAtMs <= Date.now() + 5_000);
  const keySet = createRemoteJWKSet(
    new URL(`${configuration.issuer}/protocol/openid-connect/certs`),
  );
  const { payload } = await jwtVerify(idToken, keySet, {
    issuer: configuration.issuer,
    audience: HUMAN_CLIENT,
    algorithms: ["RS256"],
    requiredClaims: ["exp", "iat", "sub", "nonce", "auth_time"],
  });
  assert.ok(payload.nonce === authorization.nonce, "Nonce binds the ID token");
  assert.equal(
    payload.sub,
    actor.subject,
    "ID and access token refer to the same verified subject",
  );
  assert.ok(
    payload.auth_time === actor.signedInAtMs / 1_000,
    "ID and API admission share the qualified authentication time",
  );
  await verifyUserInfo(configuration, accessToken, actor.subject);
  await assert.rejects(
    adapter.authenticate(idToken, new AbortController().signal),
    (error: unknown) =>
      error instanceof AuthenticationFailure && error.reason === "UNAUTHENTICATED",
  );
  const replay = await exchangeCode(configuration, authorization);
  assert.equal(replay.status, 400, "Authorization code replay is rejected");
  await replay.body?.cancel();
};

const verifyPkce = async (configuration: NativeKeycloakConfiguration): Promise<void> => {
  const authorization = await authorize(configuration);
  const wrong = await exchangeCode(configuration, { ...authorization, verifier: "x".repeat(64) });
  assert.equal(wrong.status, 400, "Wrong PKCE verifier is rejected");
  await wrong.body?.cancel();
  const missing = await fetch(authorizationUrl(configuration, "test-state", "test-nonce"), {
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  const location = missing.headers.get("location");
  const errorRedirect = location === null ? undefined : new URL(location);
  assert.ok(
    missing.status === 400 ||
      ((missing.status === 302 || missing.status === 303) &&
        errorRedirect?.searchParams.has("error") === true &&
        !errorRedirect.searchParams.has("code")),
    "The client cannot start authorization without PKCE",
  );
  await missing.body?.cancel();
};

const verifyGrantBoundary = async (
  configuration: NativeKeycloakConfiguration,
  adapter: ReturnType<typeof createKeycloakAuthentication>,
): Promise<void> => {
  for (const parameters of [
    { grant_type: "client_credentials" },
    { grant_type: "password", username: "fixture-person", password: configuration.password },
  ]) {
    const denied = await tokenRequest(
      configuration,
      HUMAN_CLIENT,
      configuration.humanSecret,
      parameters,
    );
    assert.ok(
      denied.status === 400 || denied.status === 401,
      "Human client cannot use an alternate grant",
    );
    await denied.body?.cancel();
  }
  const response = await tokenRequest(
    configuration,
    WORKLOAD_CLIENT,
    configuration.workloadSecret,
    { grant_type: "client_credentials", scope: "identity.status:read" },
  );
  assert.equal(response.status, 200, "Separate workload grant succeeds");
  const tokens: unknown = await response.json();
  const actor = await adapter.authenticate(
    requiredToken(tokens, "access_token"),
    new AbortController().signal,
  );
  assert.equal(actor.kind, "workload", "Native service credential cannot become a human admission");
  assert.equal(actor.consumerId, "gettok");
};

const configuration = nativeConfiguration();
const adapter = createKeycloakAuthentication({
  issuer: configuration.issuer,
  authorityId: "keycloak-test",
  authorityIncarnation: "keycloak-test-v1",
  clients: [
    {
      kind: "human",
      clientId: HUMAN_CLIENT,
      consumerId: "gettok",
      providerControlPolicyId: "gettok-ordinary-login",
      policyVersion: "1",
    },
    { kind: "workload", clientId: WORKLOAD_CLIENT, consumerId: "gettok" },
  ],
});

await verifyHuman(configuration, adapter);
await verifyPkce(configuration);
await verifyGrantBoundary(configuration, adapter);
process.stdout.write(
  `${JSON.stringify({
    profile: "provider-session-control-v1",
    authorizationCodePkce: "passed",
    replayAndGrantBoundary: "passed",
    nativeJwtAdapter: "passed",
    userinfoBinding: "passed",
    independentContinuity: "not-admitted",
    socialBrokerQualification: "not-run",
  })}\n`,
);
