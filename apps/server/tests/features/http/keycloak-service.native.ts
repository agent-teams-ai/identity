import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { Code, ConnectError, createClient, type Client } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import {
  AccountEligibility,
  IdentityErrorDetailSchema,
  IdentityErrorReason,
  IdentityService,
  type AccountReference,
} from "@agent-teams/identity-contracts";
import { startServer } from "../../../src/composition/server.root.js";

const execute = promisify(execFile);
const coreFixture = (name: string): string =>
  resolve(process.cwd(), `.test-build/packages/identity/tests/features/account/${name}.native.js`);

const fixture = async (name: string, args: readonly string[] = []): Promise<unknown> => {
  try {
    const result = await execute(process.execPath, [coreFixture(name), ...args], {
      env: process.env,
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 65_536,
    });
    const value: unknown = JSON.parse(result.stdout);
    return value;
  } catch {
    // Child stdout can contain actual disposable tokens. Do not attach it to errors.
    throw new Error(`Native core fixture failed: ${name}`);
  }
};

const credentials = async (): Promise<{ readonly human: string; readonly workload: string }> => {
  const result = await fixture("keycloak-credentials");
  assert.ok(
    typeof result === "object" &&
      result !== null &&
      "accessToken" in result &&
      "workloadToken" in result,
    "Native credential fixture returned its bounded shape",
  );
  assert.ok(
    typeof result.accessToken === "string" && typeof result.workloadToken === "string",
    "Native credentials exist",
  );
  return { human: result.accessToken, workload: result.workloadToken };
};

const rejection =
  (reason: IdentityErrorReason) =>
  (error: unknown): boolean =>
    error instanceof ConnectError &&
    error.code === Code.FailedPrecondition &&
    error.findDetails(IdentityErrorDetailSchema)[0]?.reason === reason;

const transition = async (
  account: AccountReference,
  action: string,
  revision: bigint,
): Promise<void> => {
  const result = await fixture("account-lifecycle", [
    account.accountId,
    account.authorityIncarnation,
    action,
    revision.toString(),
  ]);
  assert.ok(
    typeof result === "object" &&
      result !== null &&
      "committed" in result &&
      result.committed === true,
    "Production lifecycle transaction completed before the next wire request",
  );
};

const exercise = async (client: Client<typeof IdentityService>): Promise<void> => {
  const tokens = await credentials();
  const human = { headers: { authorization: `Bearer ${tokens.human}` } };
  const machine = { headers: { authorization: `Bearer ${tokens.workload}` } };
  const command = { idempotencyKey: "native-provider-wire-login-1" };
  const first = await client.resolveSelf(command, human);
  assert.ok(
    first.status?.account !== undefined && first.admission !== undefined,
    "Real provider login admits an account",
  );
  const account = first.status.account;
  assert.equal(first.status.eligibility, AccountEligibility.ACTIVE);
  assert.equal(first.admission.policyId, "gettok-ordinary-login");
  assert.deepEqual(
    await client.resolveSelf(command, human),
    first,
    "Receipt replay preserves original evidence",
  );
  assert.deepEqual((await client.getSelfStatus({}, human)).status?.account, account);
  assert.deepEqual((await client.getAccountStatus({ account }, machine)).status?.account, account);
  await assert.rejects(
    client.resolveSelf(command, machine),
    (error: unknown) => error instanceof ConnectError && error.code === Code.PermissionDenied,
  );
  await assert.rejects(
    client.getAccountStatus({ account }, human),
    (error: unknown) => error instanceof ConnectError && error.code === Code.PermissionDenied,
  );
  await transition(account, "suspend", first.status.accountRevision);
  const suspended = (await client.getAccountStatus({ account }, machine)).status;
  assert.ok(suspended !== undefined && suspended.eligibility === AccountEligibility.SUSPENDED);
  assert.ok(
    suspended.securityEpoch > first.status.securityEpoch,
    "Suspension advances the durable revocation fence",
  );
  await assert.rejects(
    client.resolveSelf(command, human),
    rejection(IdentityErrorReason.ACCOUNT_SUSPENDED),
  );
  await transition(account, "enable", suspended.accountRevision);
  const enabled = (await client.getAccountStatus({ account }, machine)).status;
  assert.ok(enabled !== undefined && enabled.eligibility === AccountEligibility.ACTIVE);
  assert.equal(enabled.securityEpoch, suspended.securityEpoch, "Enable does not erase revocation");
  await assert.rejects(
    client.resolveSelf(command, human),
    rejection(IdentityErrorReason.AUTHENTICATION_REQUIRED_AFTER_CUTOFF),
  );
  await assert.rejects(
    client.resolveSelf({ idempotencyKey: "native-provider-old-token-new-key" }, human),
    rejection(IdentityErrorReason.AUTHENTICATION_REQUIRED_AFTER_CUTOFF),
  );
  await transition(account, "close", enabled.accountRevision);
  assert.equal(
    (await client.getAccountStatus({ account }, machine)).status?.eligibility,
    AccountEligibility.CLOSED,
  );
  await assert.rejects(
    client.resolveSelf(command, human),
    rejection(IdentityErrorReason.ACCOUNT_CLOSED),
  );
};

const databaseUrl = process.env.IDENTITY_TEST_DATABASE_URL;
const issuer = process.env.IDENTITY_TEST_ISSUER;
assert.ok(databaseUrl !== undefined && new URL(databaseUrl).pathname === "/identity_test");
assert.ok(issuer !== undefined, "Native service fixture requires the actual provider issuer");
const server = await startServer({
  databaseUrl,
  host: "127.0.0.1",
  port: 0,
  authentication: {
    issuer,
    authorityId: "keycloak-test",
    authorityIncarnation: "keycloak-test-v1",
    clients: [
      {
        kind: "human",
        clientId: "gettok-test-bff",
        consumerId: "gettok",
        providerControlPolicyId: "gettok-ordinary-login",
        policyVersion: "1",
      },
      { kind: "workload", clientId: "gettok-test-workload", consumerId: "gettok" },
    ],
  },
});
try {
  await exercise(
    createClient(
      IdentityService,
      createConnectTransport({ baseUrl: server.address, httpVersion: "1.1" }),
    ),
  );
  process.stdout.write(
    `${JSON.stringify({
      nativeIdentityService: "passed",
      provider: "actual-keycloak",
      transport: "actual-connect-tcp",
      persistence: "actual-postgresql",
      lifecycleRevocation: "passed",
      staleReceiptRejected: true,
      independentContinuity: "not-admitted",
    })}\n`,
  );
} finally {
  assert.ok((await server.close()).complete, "Native server resources close completely");
}
