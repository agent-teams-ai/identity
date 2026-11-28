import assert from "node:assert/strict";
import { connect, type Socket } from "node:net";
import { test } from "node:test";
import { Code, ConnectError, createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import {
  IdentityErrorDetailSchema,
  IdentityErrorReason,
  IdentityService,
} from "@agent-teams/identity-contracts";
import type {
  AccountApi,
  AccountStatus,
  HumanAuthority,
  WorkloadAuthority,
} from "@agent-teams/identity-core";
import { createFastifyHost } from "../../../src/features/http/adapters/inbound/fastify-host.js";
import type { HttpHostOptions } from "../../../src/features/http/adapters/inbound/fastify-host.js";

const now = Date.now();
const status: AccountStatus = {
  account: {
    accountId: "019abcde-0000-7000-8000-000000000001",
    authorityIncarnation: "test-realm-1",
  },
  consumerId: "gettok",
  eligibility: "active",
  accountRevision: 9_007_199_254_740_995n,
  securityEpoch: 9_007_199_254_740_993n,
  authenticationCutoffMs: 0,
  attachmentGeneration: 9_007_199_254_740_997n,
  reattachmentCutoffMs: 0,
  observedAtMs: now,
  validUntilMs: now + 55_000,
};
const human: HumanAuthority = {
  kind: "human",
  authorityId: "primary",
  issuer: "https://identity.test/realms/test",
  subject: "human-1",
  authorityIncarnation: "test-realm-1",
  consumerId: "gettok",
  clientId: "gettok-web",
  authoritySessionId: "native-session-1",
  signedInAtMs: now - 1_000,
  credentialExpiresAtMs: now + 300_000,
  proof: {
    profile: "provider-session-control-v1",
    authenticatedAtMs: now - 1_000,
    validUntilMs: now + 295_000,
    policyVersion: "1",
    scope: "gettok.personal",
  },
};
const workload: WorkloadAuthority = {
  kind: "workload",
  clientId: "gettok-status",
  consumerId: "gettok",
  credentialExpiresAtMs: now + 300_000,
};
const options: HttpHostOptions = {
  ready: async () => true,
  authentication: {
    authenticate: async (bearer) => {
      if (bearer === "human") {
        return human;
      }
      if (bearer === "workload") {
        return workload;
      }
      throw Object.assign(new Error("secret provider diagnostic"), { reason: "UNAUTHENTICATED" });
    },
  },
  accounts: {
    resolveSelf: async () => ({
      status,
      admission: { authoritySessionId: human.authoritySessionId, ...human.proof },
    }),
    getSelfStatus: async () => status,
    getAccountStatus: async () => status,
  },
};

async function withHttp(
  run: (baseUrl: string) => Promise<void>,
  overrides: Partial<HttpHostOptions> = {},
): Promise<void> {
  const server = await createFastifyHost({ ...options, ...overrides });
  try {
    await run(await server.listen({ host: "127.0.0.1", port: 0 }));
  } finally {
    await server.close();
    await server.close();
  }
}
const rejectedWith =
  (code: Code) =>
  (error: unknown): boolean =>
    error instanceof ConnectError && error.code === code;

await test("real TCP Connect boundary preserves uint64, absolute deadlines and separate authority classes", async () => {
  await withHttp(async (baseUrl) => {
    const client = createClient(
      IdentityService,
      createConnectTransport({ baseUrl, httpVersion: "1.1" }),
    );
    const user = { headers: { authorization: "Bearer human" } };
    const machine = { headers: { authorization: "Bearer workload" } };
    const result = await client.resolveSelf({ idempotencyKey: "http-session-login-1" }, user);
    assert.equal(result.status?.accountRevision, status.accountRevision);
    assert.equal(result.status.attachmentGeneration, status.attachmentGeneration);
    assert.equal(result.admission?.authoritySessionId, human.authoritySessionId);
    assert.equal(result.admission.policyId, "gettok.personal");
    const json = await fetch(`${baseUrl}/identity.v1.IdentityService/GetAccountStatus`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer workload",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ account: status.account }),
    });
    assert.equal(json.status, 200);
    assert.match(await json.text(), /"accountRevision":"9007199254740995"/u);
    assert.equal(json.headers.get("cache-control"), "no-store");
    assert.equal(
      (await client.getAccountStatus({ account: status.account }, machine)).status?.consumerId,
      "gettok",
    );
    await assert.rejects(
      client.resolveSelf({ idempotencyKey: "workload-login-1" }, machine),
      rejectedWith(Code.PermissionDenied),
    );
    await assert.rejects(
      client.getAccountStatus({ account: status.account }, user),
      rejectedWith(Code.PermissionDenied),
    );
    await assert.rejects(client.getSelfStatus({}, machine), rejectedWith(Code.PermissionDenied));
    await assert.rejects(client.getSelfStatus({}), rejectedWith(Code.Unauthenticated));
    await assert.rejects(client.getAccountStatus({}, machine), rejectedWith(Code.InvalidArgument));
  });
});

await test("transport exposes stable denial details and conceals internal failure data", async () => {
  const accounts: AccountApi = {
    ...options.accounts,
    getSelfStatus: async () => {
      throw Object.assign(new Error("sensitive SQL/provider text"), {
        reason: "ACCOUNT_SUSPENDED",
      });
    },
    getAccountStatus: async () => {
      throw new Error("sensitive connectionString");
    },
  };
  await withHttp(
    async (baseUrl) => {
      const client = createClient(
        IdentityService,
        createConnectTransport({ baseUrl, httpVersion: "1.1" }),
      );
      await assert.rejects(
        client.getSelfStatus({}, { headers: { authorization: "Bearer human" } }),
        (error: unknown) => {
          assert.ok(error instanceof ConnectError);
          assert.equal(error.code, Code.FailedPrecondition);
          assert.equal(
            error.findDetails(IdentityErrorDetailSchema)[0]?.reason,
            IdentityErrorReason.ACCOUNT_SUSPENDED,
          );
          assert.doesNotMatch(error.message, /sensitive/u);
          return true;
        },
      );
      await assert.rejects(
        client.getAccountStatus(
          { account: status.account },
          { headers: { authorization: "Bearer workload" } },
        ),
        (error: unknown) => {
          assert.ok(error instanceof ConnectError);
          assert.equal(error.code, Code.Unavailable);
          assert.doesNotMatch(error.message, /sensitive/u);
          return true;
        },
      );
    },
    { accounts },
  );
});

await test("oversized requests never reach account use cases and readiness failure is visible", async () => {
  let calls = 0;
  await withHttp(
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/identity.v1.IdentityService/ResolveSelf`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer human" },
        body: JSON.stringify({ idempotencyKey: "a".repeat(9_000) }),
      });
      assert.ok(response.status >= 400 && response.status < 500);
      assert.equal(calls, 0);
      assert.equal((await fetch(`${baseUrl}/health/ready`)).status, 503);
      assert.equal((await fetch(`${baseUrl}/health/live`)).status, 200);
    },
    {
      ready: async () => false,
      accounts: {
        ...options.accounts,
        resolveSelf: async () => {
          calls += 1;
          return options.accounts.resolveSelf(human, "oversized-call-invalid");
        },
      },
    },
  );
});

await test(
  "incomplete HTTP bodies release sockets through one shared shutdown",
  { timeout: 5_000 },
  async (context) => {
    let calls = 0;
    const server = await createFastifyHost({
      ...options,
      accounts: {
        ...options.accounts,
        resolveSelf: async () => {
          calls += 1;
          return options.accounts.resolveSelf(human, "incomplete-request-invalid");
        },
      },
    });
    const sockets: Socket[] = [];
    try {
      const address = new URL(await server.listen({ host: "127.0.0.1", port: 0 }));
      const endpoint = {
        host: address.hostname,
        port: Number(address.port),
        signal: context.signal,
      };
      const socket = connect(endpoint);
      sockets.push(socket);
      socket.setEncoding("utf8");
      const closed = new Promise<void>((resolve) => {
        socket.once("close", () => {
          resolve();
        });
      });
      const accepted = new Promise<void>((resolve, reject) => {
        let response = "";
        const receive = (chunk: string): void => {
          response += chunk;
          if (response.length > 1_024) {
            reject(new Error("Unexpected oversized response to incomplete request"));
          } else if (response.includes("\r\n\r\n")) {
            socket.off("data", receive);
            if (response.startsWith("HTTP/1.1 100 Continue\r\n")) {
              resolve();
            } else {
              reject(new Error("Server did not admit the incomplete request headers"));
            }
          }
        };
        socket.on("data", receive);
        socket.once("error", reject);
        socket.once("close", () => {
          reject(new Error("Connection closed before the incomplete request was accepted"));
        });
      });
      socket.write(
        "POST /identity.v1.IdentityService/ResolveSelf HTTP/1.1\r\n" +
          `Host: ${address.host}\r\n` +
          "Content-Type: application/json\r\n" +
          "Authorization: Bearer human\r\n" +
          "Content-Length: 128\r\n" +
          "Expect: 100-continue\r\n\r\n{",
      );
      await accepted;
      assert.equal(calls, 0, "Incomplete input has not reached the account boundary");
      const first = server.close();
      const second = server.close();
      assert.equal(first, second, "Concurrent callers retain the original cleanup flight");
      await Promise.all([first, second, closed]);
      assert.equal(socket.destroyed, true, "Shutdown physically released the pending socket");
      assert.equal(calls, 0, "Shutdown cannot complete an incomplete account request");
      const probe = connect(endpoint);
      sockets.push(probe);
      const failure = await new Promise<NodeJS.ErrnoException>((resolve, reject) => {
        probe.once("error", resolve);
        probe.once("connect", () => {
          reject(new Error("HTTP listener still accepts connections after shutdown"));
        });
      });
      assert.equal(failure.code, "ECONNREFUSED", "The listener is physically closed");
    } finally {
      for (const socket of sockets) {
        socket.destroy();
      }
      await server.close();
    }
  },
);
