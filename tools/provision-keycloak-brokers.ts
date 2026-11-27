import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Provider = "github" | "gitlab";
interface Credentials {
  readonly clientId: string;
  readonly clientSecret: string;
}
export interface BrokerProvisioning {
  readonly adminBaseUrl: string;
  readonly realm: string;
  readonly adminToken: string;
  readonly firstBrokerLoginFlow: string;
  readonly credentials: Readonly<Record<Provider, Credentials>>;
  readonly allowTestLoopback?: boolean;
}
interface ProviderRepresentation {
  readonly alias: Provider;
  readonly providerId: Provider;
  readonly enabled: boolean;
  readonly trustEmail: boolean;
  readonly storeToken: boolean;
  readonly firstBrokerLoginFlowAlias: string;
  readonly config: Credentials;
}

const brokers = ["github", "gitlab"] as const;
const nonempty = (value: string, max: number): boolean =>
  value.length > 0 &&
  value.length <= max &&
  value.trim() === value &&
  !/[\u0000-\u001f\u007f]/u.test(value);

function endpoint(input: BrokerProvisioning): string {
  let url: URL;
  try {
    url = new URL(input.adminBaseUrl);
  } catch {
    throw new Error("Invalid trusted Keycloak administrator endpoint");
  }
  const loopback = url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  if (
    (url.protocol !== "https:" && !(input.allowTestLoopback && url.protocol === "http:" && loopback)) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    input.adminBaseUrl !== url.origin + (url.pathname === "/" ? "" : url.pathname) ||
    /%|\/\//u.test(url.pathname) ||
    !/^[a-zA-Z0-9_-]{1,64}$/u.test(input.realm)
  ) {
    throw new Error("Invalid trusted Keycloak administrator endpoint");
  }
  return url.origin + (url.pathname === "/" ? "" : url.pathname) + "/admin/realms/" + input.realm;
}

function validate(input: BrokerProvisioning): string {
  const root = endpoint(input);
  if (
    !nonempty(input.adminToken, 8192) ||
    !/^[a-zA-Z0-9_.-]{1,100}$/u.test(input.firstBrokerLoginFlow) ||
    input.firstBrokerLoginFlow === "first broker login"
  ) {
    throw new Error("Explicit reviewed broker flow and admin credentials are required");
  }
  for (const name of brokers) {
    const credentials = input.credentials[name];
    if (!nonempty(credentials.clientId, 512) || !nonempty(credentials.clientSecret, 2048)) {
      throw new Error("Missing bounded " + name + " OAuth application credentials");
    }
  }
  return root;
}

async function readJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > 65_536 || response.body === null) {
    throw new Error("Invalid Keycloak administrator response");
  }
  const reader = response.body.getReader();
  const pieces: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      bytes += result.value.byteLength;
      if (bytes > 65_536) {
        throw new Error("Keycloak administrator response is too large");
      }
      pieces.push(result.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(pieces)));
  } catch {
    throw new Error("Invalid Keycloak administrator response");
  }
}

/**
 * Create GitHub and GitLab broker entries disabled, without exposing their
 * tokens or trusting matching email. Activation requires separate real-provider
 * login and supported first-broker-flow qualification.
 */
export async function provisionKeycloakBrokers(
  input: BrokerProvisioning,
  request: typeof fetch = fetch,
): Promise<readonly Provider[]> {
  const root = validate(input);
  const route = root + "/identity-provider/instances";
  const call = async (path: string, method: "GET" | "POST", body?: string) => {
    try {
      const result = await request(path, {
        method,
        redirect: "error",
        signal: AbortSignal.timeout(7_000),
        headers: {
          accept: "application/json",
          authorization: "Bearer " + input.adminToken,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body }),
      });
      if (method === "GET" && result.status === 200) {
        return readJson(result);
      }
      if (method === "POST" && result.status === 201) {
        await result.body?.cancel();
        return undefined;
      }
    } catch {
      // Upstream errors may contain secrets or serialized request bodies.
    }
    throw new Error("Keycloak broker " + method + " could not be qualified");
  };
  const flows = await call(root + "/authentication/flows", "GET");
  if (
    !Array.isArray(flows) ||
    !flows.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "alias" in item &&
        item.alias === input.firstBrokerLoginFlow,
    )
  ) {
    throw new Error("Reviewed first-broker login flow is not installed");
  }
  const existing = await call(route, "GET");
  if (
    !Array.isArray(existing) ||
    existing.length > 32 ||
    existing.some(
      (item: unknown) =>
        typeof item !== "object" || item === null || !("alias" in item) || typeof item.alias !== "string",
    ) ||
    existing.some((item: { alias?: string }) => brokers.some((name) => item.alias === name))
  ) {
    throw new Error("Existing broker aliases require manual reconciliation");
  }
  const created: Provider[] = [];
  for (const alias of brokers) {
    const representation: ProviderRepresentation = {
      alias,
      providerId: alias,
      enabled: false,
      trustEmail: false,
      storeToken: false,
      firstBrokerLoginFlowAlias: input.firstBrokerLoginFlow,
      config: input.credentials[alias],
    };
    try {
      await call(route, "POST", JSON.stringify(representation));
      created.push(alias);
    } catch {
      throw new Error("Broker provisioning stopped; created disabled: " + (created.join(",") || "none"));
    }
  }
  const observed = await call(route, "GET");
  if (
    !Array.isArray(observed) ||
    !brokers.every((alias) =>
      observed.some(
        (item: unknown) =>
          typeof item === "object" &&
          item !== null &&
          "alias" in item &&
          item.alias === alias &&
          "providerId" in item &&
          item.providerId === alias &&
          "enabled" in item &&
          item.enabled === false &&
          "trustEmail" in item &&
          item.trustEmail === false &&
          "storeToken" in item &&
          item.storeToken === false &&
          "firstBrokerLoginFlowAlias" in item &&
          item.firstBrokerLoginFlowAlias === input.firstBrokerLoginFlow,
      ),
    )
  ) {
    throw new Error("Broker setup requires operator review of actual stored state");
  }
  return created;
}

if (process.argv[1] !== undefined && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const env = process.env;
    const created = await provisionKeycloakBrokers({
      adminBaseUrl: env.KEYCLOAK_ADMIN_BASE_URL ?? "",
      realm: env.KEYCLOAK_REALM ?? "",
      adminToken: env.KEYCLOAK_ADMIN_ACCESS_TOKEN ?? "",
      firstBrokerLoginFlow: env.KEYCLOAK_FIRST_BROKER_FLOW ?? "",
      credentials: {
        github: {
          clientId: env.GITHUB_OAUTH_CLIENT_ID ?? "",
          clientSecret: env.GITHUB_OAUTH_CLIENT_SECRET ?? "",
        },
        gitlab: {
          clientId: env.GITLAB_OAUTH_CLIENT_ID ?? "",
          clientSecret: env.GITLAB_OAUTH_CLIENT_SECRET ?? "",
        },
      },
    });
    process.stdout.write("Created disabled Keycloak brokers: " + created.join(",") + "\n");
  } catch {
    process.stderr.write("Keycloak broker provisioning refused; inspect provider state securely.\n");
    process.exitCode = 1;
  }
}
