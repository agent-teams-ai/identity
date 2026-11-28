import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

type Broker = "github" | "gitlab";

interface Credentials {
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface BrokerProvisioning {
  readonly adminBaseUrl: string;
  readonly realm: string;
  readonly adminToken: string;
  readonly firstBrokerLoginFlow: string;
  readonly credentials: Readonly<Record<Broker, Credentials>>;
  readonly allowTestLoopback?: boolean;
}

const brokers = ["github", "gitlab"] as const;

function bounded(value: string, maximum: number): boolean {
  return (
    value.length > 0 &&
    value.length <= maximum &&
    value === value.trim() &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function validate(input: BrokerProvisioning): string {
  let url: URL;
  try {
    url = new URL(input.adminBaseUrl);
  } catch {
    throw new Error("Invalid trusted Keycloak administrator endpoint");
  }
  const testLoopback = url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  const base = url.pathname === "/" ? url.origin : url.origin + url.pathname;
  if (
    (url.protocol !== "https:" &&
      !(input.allowTestLoopback && url.protocol === "http:" && testLoopback)) ||
    !url.hostname ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    base !== input.adminBaseUrl ||
    /%|\/\//u.test(url.pathname) ||
    !/^[a-zA-Z0-9_-]{1,64}$/u.test(input.realm)
  ) {
    throw new Error("Invalid trusted Keycloak administrator endpoint");
  }
  if (
    !bounded(input.adminToken, 8192) ||
    !/^[a-zA-Z0-9_.-]{1,100}$/u.test(input.firstBrokerLoginFlow) ||
    input.firstBrokerLoginFlow === "first broker login"
  ) {
    throw new Error("Explicit reviewed broker flow and admin credential are required");
  }
  for (const alias of brokers) {
    const candidate = input.credentials[alias];
    if (!bounded(candidate.clientId, 512) || !bounded(candidate.clientSecret, 2048)) {
      throw new Error("Missing bounded " + alias + " OAuth application credentials");
    }
  }
  return base + "/admin/realms/" + input.realm;
}

async function readJson(response: Response): Promise<unknown> {
  const length = Number(response.headers.get("content-length") ?? "0");
  if (length > 65_536 || response.body === null) {
    throw new Error("Keycloak administrator response is too large");
  }
  const chunks: Uint8Array[] = [];
  let size = 0;
  const reader = response.body.getReader();
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) {
        break;
      }
      size += next.value.byteLength;
      if (size > 65_536) {
        throw new Error("Keycloak administrator response is too large");
      }
      chunks.push(next.value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
  } catch {
    throw new Error("Invalid Keycloak administrator response");
  }
}

/**
 * Create-only and disabled. No auto-linking by email, no browser activation.
 * Production enabling requires a separate actual-provider qualification.
 */
export async function provisionKeycloakBrokers(
  input: BrokerProvisioning,
  request: typeof fetch = fetch,
): Promise<readonly Broker[]> {
  const root = validate(input);
  const route = root + "/identity-provider/instances";
  const call = async (path: string, method: "GET" | "POST", body?: string): Promise<unknown> => {
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
        return await readJson(result);
      }
      if (method === "POST" && result.status === 201) {
        return undefined;
      }
    } catch {
      // Never expose credential-bearing upstream errors or raw responses.
    }
    throw new Error("Keycloak broker " + method + " could not be qualified");
  };
  const flows = await call(root + "/authentication/flows", "GET");
  if (
    !Array.isArray(flows) ||
    !flows.some(
      (value: unknown) =>
        typeof value === "object" &&
        value !== null &&
        "alias" in value &&
        value.alias === input.firstBrokerLoginFlow,
    )
  ) {
    throw new Error("Reviewed first-broker login flow is not installed");
  }
  const existing = await call(route, "GET");
  if (
    !Array.isArray(existing) ||
    existing.length > 32 ||
    existing.some(
      (value: unknown) =>
        typeof value !== "object" ||
        value === null ||
        !("alias" in value) ||
        typeof value.alias !== "string",
    ) ||
    existing.some((value: { alias?: string }) => brokers.some((name) => name === value.alias))
  ) {
    throw new Error("Existing broker aliases require manual reconciliation");
  }
  const created: Broker[] = [];
  for (const alias of brokers) {
    const entry = {
      alias,
      providerId: alias,
      enabled: false,
      trustEmail: false,
      storeToken: false,
      firstBrokerLoginFlowAlias: input.firstBrokerLoginFlow,
      config: input.credentials[alias],
    };
    try {
      await call(route, "POST", JSON.stringify(entry));
      created.push(alias);
    } catch {
      throw new Error(
        "Broker provisioning stopped; created disabled: " + (created.join(",") || "none"),
      );
    }
  }
  const recorded = await call(route, "GET");
  if (
    !Array.isArray(recorded) ||
    !brokers.every((alias) =>
      recorded.some(
        (value: unknown) =>
          typeof value === "object" &&
          value !== null &&
          "alias" in value &&
          value.alias === alias &&
          "providerId" in value &&
          value.providerId === alias &&
          "enabled" in value &&
          value.enabled === false &&
          "trustEmail" in value &&
          value.trustEmail === false &&
          "storeToken" in value &&
          value.storeToken === false &&
          "firstBrokerLoginFlowAlias" in value &&
          value.firstBrokerLoginFlowAlias === input.firstBrokerLoginFlow,
      ),
    )
  ) {
    throw new Error("Broker setup requires operator review of actual stored state");
  }
  return created;
}

if (
  process.argv[1] !== undefined &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
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
    process.stderr.write("Keycloak broker provisioning refused; inspect state securely.\n");
    process.exitCode = 1;
  }
}
