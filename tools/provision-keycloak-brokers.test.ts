import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { provisionKeycloakBrokers } from "./provision-keycloak-brokers.js";
import type { BrokerProvisioning } from "./provision-keycloak-brokers.js";

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

interface BrokerRecord {
  readonly alias: string;
  readonly providerId: string;
  readonly enabled: boolean;
  readonly trustEmail: boolean;
  readonly storeToken: boolean;
  readonly firstBrokerLoginFlowAlias: string;
  readonly config: { readonly clientId: string; readonly clientSecret: string };
}

async function fixture() {
  const created: BrokerRecord[] = [];
  let rejectSecond = false;
  const server = createServer((request, response) => {
    void (async () => {
      const chunks: Uint8Array[] = [];
      for await (const chunk of request) {
        const value: unknown = chunk;
        if (!(value instanceof Uint8Array)) {
          throw new TypeError("Invalid request chunk");
        }
        chunks.push(value);
      }
      assert.equal(request.headers.authorization, "Bearer disposable-admin-token");
    if (request.url === "/admin/realms/test-realm/authentication/flows") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify([{ alias: "reviewed-no-email-link" }]));
      return;
    }
    const providerPath = "/admin/realms/test-realm/identity-provider/instances";
    if (request.url === providerPath && request.method === "GET") {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify(created));
      return;
    }
    if (request.url === providerPath && request.method === "POST") {
      const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.ok(typeof value === "object" && value !== null && "alias" in value);
      if (value.alias === "gitlab" && rejectSecond) {
        response.writeHead(409);
        response.end();
        return;
      }
      created.push(value as BrokerRecord);
      response.writeHead(201);
      response.end();
      return;
    }
      response.writeHead(404);
      response.end();
    })().catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fixture did not bind a TCP port");
  }
  return {
    created,
    base: "http://127.0.0.1:" + address.port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve();
        });
      }),
    failSecond: () => {
      rejectSecond = true;
    },
  };
}

void test("Keycloak broker provisioning is disabled, explicit and rejects replay", async (t) => {
  const server = await fixture();
  t.after(server.close);
  assert.deepEqual(await provisionKeycloakBrokers(options(server.base)), ["github", "gitlab"]);
  assert.deepEqual(
    server.created.map((value) => [
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

void test("broker inputs reject unsafe URLs and absent credentials before any network request", async () => {
  const credentials = options("https://id.example.com");
  const missing: BrokerProvisioning = {
    ...credentials,
    credentials: {
      ...credentials.credentials,
      github: { clientId: "fixture-github", clientSecret: "" },
    },
  };
  await assert.rejects(
    provisionKeycloakBrokers(missing, () => {
      throw new Error("Network must not run");
    }),
    /Missing bounded github/,
  );
  await assert.rejects(
    provisionKeycloakBrokers(options("http://untrusted.example.com"), () => {
      throw new Error("Network must not run");
    }),
    /Invalid trusted/,
  );
});

void test("partial broker creation remains disabled and needs manual reconciliation", async (t) => {
  const server = await fixture();
  t.after(server.close);
  server.failSecond();
  await assert.rejects(provisionKeycloakBrokers(options(server.base)), /created disabled: github/);
  assert.equal(server.created.length, 1);
  assert.equal(server.created[0]?.enabled, false);
});
