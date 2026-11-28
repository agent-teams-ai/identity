import assert from "node:assert/strict";
import {
  authorize,
  exchangeCode,
  nativeConfiguration,
  requiredToken,
  tokenRequest,
} from "./keycloak-browser-fixture.js";

// This test-only process returns credentials exclusively over a captured pipe.
// The orchestrating fixture must never inherit this stdout or log its contents.
const consumer = process.argv[2] ?? "gettok";
assert.ok(
  process.argv.length <= 3 && (consumer === "gettok" || consumer === "second-product"),
  "Only the two disposable consumers are admitted",
);
const configuration = nativeConfiguration(consumer);
const human = await exchangeCode(configuration, await authorize(configuration));
assert.equal(human.status, 200, "Native human code exchange succeeds");
const humanBody: unknown = await human.json();
const workload = await tokenRequest(
  configuration,
  configuration.workloadClientId,
  configuration.workloadSecret,
  { grant_type: "client_credentials", scope: "identity.status:read" },
);
assert.equal(workload.status, 200, "Native workload grant succeeds");
const workloadBody: unknown = await workload.json();
process.stdout.write(
  JSON.stringify({
    accessToken: requiredToken(humanBody, "access_token"),
    workloadToken: requiredToken(workloadBody, "access_token"),
  }),
);
