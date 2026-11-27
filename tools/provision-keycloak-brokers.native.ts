import assert from "node:assert/strict";
import { provisionKeycloakBrokers } from "./provision-keycloak-brokers.js";

const issuer = new URL(process.env.IDENTITY_TEST_ISSUER ?? "");
assert.equal(issuer.origin, "http://127.0.0.1:18080", "Disposable local Keycloak only");
assert.equal(issuer.pathname, "/realms/identity-test", "Disposable realm only");

const clientId = process.env.KC_BOOTSTRAP_ADMIN_CLIENT_ID;
const clientSecret = process.env.KC_BOOTSTRAP_ADMIN_CLIENT_SECRET;
assert.ok(clientId !== undefined && clientId.length > 0);
assert.ok(clientSecret !== undefined && clientSecret.length > 0);

const token = await fetch(issuer.origin + "/realms/master/protocol/openid-connect/token", {
  method: "POST",
  redirect: "error",
  signal: AbortSignal.timeout(10_000),
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  }),
});
assert.equal(token.status, 200, "Disposable bootstrap admin grant succeeds");
const parsed: unknown = await token.json();
assert.ok(
  typeof parsed === "object" &&
    parsed !== null &&
    "access_token" in parsed &&
    typeof parsed.access_token === "string" &&
    parsed.access_token.length > 0,
  "Actual Keycloak returns a confidential admin credential",
);
const accessToken = parsed.access_token;
const admin = issuer.origin + "/admin/realms/identity-test";
const createFlow = await fetch(admin + "/authentication/flows", {
  method: "POST",
  redirect: "error",
  signal: AbortSignal.timeout(10_000),
  headers: {
    authorization: "Bearer " + accessToken,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    alias: "native-test-empty-disabled-broker-flow",
    description: "Disposable native test only; not approved for real broker authentication",
    providerId: "basic-flow",
    topLevel: true,
    builtIn: false,
  }),
});
assert.equal(createFlow.status, 201, "Actual custom TEST flow is installed");
await createFlow.body?.cancel();

const input = {
  adminBaseUrl: issuer.origin,
  realm: "identity-test",
  adminToken: accessToken,
  firstBrokerLoginFlow: "native-test-empty-disabled-broker-flow",
  allowTestLoopback: true,
  credentials: {
    github: { clientId: "native-github-disposable", clientSecret: "disposable-github-native" },
    gitlab: { clientId: "native-gitlab-disposable", clientSecret: "disposable-gitlab-native" },
  },
} as const;

assert.deepEqual(await provisionKeycloakBrokers(input), ["github", "gitlab"]);
await assert.rejects(
  provisionKeycloakBrokers(input),
  /Existing broker aliases/,
  "Create-only provisioning refuses duplicate provider identities",
);
process.stdout.write(
  '{"nativeKeycloakBrokerAdmin":"passed","github":"disabled","gitlab":"disabled","oauthLogin":"not-qualified"}\n',
);
