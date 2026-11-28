import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { provisionKeycloakBrokers } from "../../../../../tools/provision-keycloak-brokers.js";
import type { BrokerProvisioning } from "../../../../../tools/provision-keycloak-brokers.js";

const options = (adminBaseUrl: string): BrokerProvisioning => ({
  adminBaseUrl,
  realm: "test-realm",
  adminToken: "disposable-admin-token",
  firstBrokerLoginFlow: "reviewed-no-email-link",
  allowTestLoopback: true,
  credentials: {
    github: { clientId: "fixture-github", clientSecret: "secret-one" },
    gitlab: { clientId: "fixture-gitlab", clientSecret: "secret-two" },
  },
});

interface RecordEntry {
  readonly alias: string;
  readonly providerId: string;
  readonly enabled: boolean;
  readonly trustEmail: boolean;
  readonly storeToken: boolean;
  readonly firstBrokerLoginFlowAlias: string;
  readonly config: { readonly clientId: string; readonly clientSecret: string };
}

async function fixture() {
  const entries: RecordEntry[] = [];
  let rejectSecond = false;
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    assert.equal(request.headers.authorization, "Bearer disposable-admin-token");
    if (request.url === "/admin/realms/test-realm/authentication/flows") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify([{ alias: "reviewed-no-email-link" }]));
      return;
    }
    const route = "/admin/realms/test-realm/identity-provider/instances";
    if (request.url === route && request.method === "GET") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(entries));
      return;
    }
    if (request.url === route && request.method === "POST") {
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.ok(typeof value === "object" && value !== null && "alias" in value);
      if (value.alias === "gitlab" && rejectSecond) {
        response.writeHead(409);
        response.end();
        return;
      }
      entries.push(value as RecordEntry);
      response.writeHead(201);
      response.end();
      return;
    }
    response.writeHead(404);
    response.end();
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fixture did not bind a TCP port");
  }
  return {
    entries,
    base: "http://127.0.0.1:" + address.port,
    close: () => new Promise<void>((done) => server.close(() => done())),
    failSecond: () => {
      rejectSecond = true;
    },
  };
}

void test("brokers are created disabled, with no email linking, and replay is denied", async (t) => {
  const server = await fixture();
  t.after(server.close);
  assert.deepEqual(await provisionKeycloakBrokers(options(server.base)), ["github", "gitlab"]);
  assert.deepEqual(
    server.entries.map((value) => [
      value.alias,
      value.providerId,
      value.enabled,
      value.trustEmail,
      value.storeToken,
      value.firstBrokerLoginFlowAlias,
    ]),
    [
      ["github", "github", false, false, false, "reviewed-no-email-link"],
      ["gitlab", "gitlab", false, false, false, "reviewed-no-email-link"],
    ],
  );
  await assert.rejects(provisionKeycloakBrokers(options(server.base)), /Existing broker aliases/);
});

void test("invalid endpoints and missing secrets refuse before sending network traffic", async () => {
  const valid = options("https://id.example.com");
  const missing: BrokerProvisioning = {
    ...valid,
    credentials: {
      ...valid.credentials,
      github: { clientId: "fixture-github", clientSecret: "" },
    },
  };
  await assert.rejects(
    provisionKeycloakBrokers(missing, () => {
      throw new Error("Network unexpectedly used");
    }),
    /Missing bounded github/,
  );
  await assert.rejects(
    provisionKeycloakBrokers(options("http://untrusted.example.com"), () => {
      throw new Error("Network unexpectedly used");
    }),
    /Invalid trusted/,
  );
});

void test("partial provisioning stays disabled and requires operator reconciliation", async (t) => {
  const server = await fixture();
  t.after(server.close);
  server.failSecond();
  await assert.rejects(provisionKeycloakBrokers(options(server.base)), /created disabled: github/);
  assert.equal(server.entries.length, 1);
  assert.equal(server.entries[0]?.enabled, false);
});
