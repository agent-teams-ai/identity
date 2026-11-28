import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";

export interface NativeKeycloakConfiguration {
  readonly issuer: string;
  readonly humanClientId: string;
  readonly workloadClientId: string;
  readonly callback: string;
  readonly humanSecret: string;
  readonly workloadSecret: string;
  readonly password: string;
}

export interface AuthorizationResult {
  readonly code: string;
  readonly verifier: string;
  readonly nonce: string;
}

export const HUMAN_CLIENT = "gettok-test-bff";
export const WORKLOAD_CLIENT = "gettok-test-workload";
export const CALLBACK = "http://127.0.0.1:18181/callback";

const environmentValue = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`Required native fixture setting: ${name}`);
  }
  return value;
};

export type FixtureConsumer = "gettok" | "second-product";

export const nativeConfiguration = (
  consumer: FixtureConsumer = "gettok",
): NativeKeycloakConfiguration => ({
  issuer: environmentValue("IDENTITY_TEST_ISSUER"),
  humanClientId: consumer === "gettok" ? HUMAN_CLIENT : "second-product-test-bff",
  workloadClientId: consumer === "gettok" ? WORKLOAD_CLIENT : "second-product-test-workload",
  callback: consumer === "gettok" ? CALLBACK : "http://127.0.0.1:18181/second-product-callback",
  humanSecret: environmentValue(
    consumer === "gettok" ? "IDENTITY_TEST_CLIENT_SECRET" : "IDENTITY_TEST_SECOND_CLIENT_SECRET",
  ),
  workloadSecret: environmentValue(
    consumer === "gettok"
      ? "IDENTITY_TEST_WORKLOAD_SECRET"
      : "IDENTITY_TEST_SECOND_WORKLOAD_SECRET",
  ),
  password: environmentValue("IDENTITY_TEST_USER_PASSWORD"),
});

const browserSession = (issuer: string) => {
  const origin = new URL(issuer).origin;
  const cookies = new Map<string, string>();
  return async (url: string, init: RequestInit = {}): Promise<Response> => {
    assert.equal(
      new URL(url).origin,
      origin,
      "Fixture credentials stay on the admitted provider origin",
    );
    const headers = new Headers(init.headers);
    if (cookies.size > 0) {
      headers.set("cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    }
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const first = cookie.split(";")[0];
      if (first === undefined) {
        continue;
      }
      const separator = first.indexOf("=");
      if (separator <= 0) {
        continue;
      }
      const name = first.slice(0, separator);
      const value = first.slice(separator + 1);
      if (/max-age=0(?:;|$)/iu.test(cookie)) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
    return response;
  };
};

export const authorizationUrl = (
  configuration: NativeKeycloakConfiguration,
  state: string,
  nonce: string,
  verifier?: string,
): string => {
  const url = new URL(`${configuration.issuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: configuration.humanClientId,
    redirect_uri: configuration.callback,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
  }).toString();
  if (verifier !== undefined) {
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set(
      "code_challenge",
      createHash("sha256").update(verifier).digest("base64url"),
    );
  }
  return url.href;
};

export const authorize = async (
  configuration: NativeKeycloakConfiguration,
): Promise<AuthorizationResult> => {
  const request = browserSession(configuration.issuer);
  const verifier = randomBytes(48).toString("base64url");
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const login = await request(authorizationUrl(configuration, state, nonce, verifier));
  assert.equal(login.status, 200, "Native authorization presents its login page");
  const html = await login.text();
  const form = html.match(/<form\b[^>]*\bid="kc-form-login"[^>]*>/u)?.[0];
  const action = form?.match(/\baction="([^"]+)"/u)?.[1];
  assert.ok(action !== undefined, "Pinned Keycloak login form exists");
  const actionUrl = new URL(action.replaceAll("&amp;", "&"), configuration.issuer).href;
  const response = await request(actionUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: "fixture-person",
      password: configuration.password,
      credentialId: "",
    }),
  });
  assert.ok(
    response.status === 302 || response.status === 303,
    "Native login redirects with a code",
  );
  const location = response.headers.get("location");
  assert.ok(location !== null, "Native callback location is present");
  const callback = new URL(location);
  assert.equal(
    `${callback.origin}${callback.pathname}`,
    configuration.callback,
    "Exact callback is preserved",
  );
  assert.ok(callback.searchParams.get("state") === state, "State binds the callback");
  const code = callback.searchParams.get("code");
  assert.ok(code !== null && code.length > 0, "Native authorization code exists");
  return { code, verifier, nonce };
};

export const tokenRequest = async (
  configuration: NativeKeycloakConfiguration,
  clientId: string,
  secret: string,
  parameters: Readonly<Record<string, string>>,
): Promise<Response> =>
  fetch(`${configuration.issuer}/protocol/openid-connect/token`, {
    method: "POST",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: new URLSearchParams(parameters),
  });

export const exchangeCode = (
  configuration: NativeKeycloakConfiguration,
  authorization: AuthorizationResult,
): Promise<Response> =>
  tokenRequest(configuration, configuration.humanClientId, configuration.humanSecret, {
    grant_type: "authorization_code",
    redirect_uri: configuration.callback,
    code: authorization.code,
    code_verifier: authorization.verifier,
  });

export const requiredToken = (document: unknown, key: string): string => {
  assert.ok(
    typeof document === "object" && document !== null && key in document,
    "Native token response has the expected shape",
  );
  const value: unknown = Reflect.get(document, key);
  assert.ok(typeof value === "string" && value.length > 0, "Native token value exists");
  return value;
};
