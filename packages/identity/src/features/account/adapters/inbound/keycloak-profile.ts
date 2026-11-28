import type { JWTPayload } from "jose";
import {
  AuthenticationFailure,
  type VerifiedActor,
  type VerifiedHuman,
} from "../../application/ports/authentication.js";

export type AdmittedKeycloakClient =
  | {
      readonly kind: "human";
      readonly clientId: string;
      readonly consumerId: string;
      readonly providerControlPolicyId: string;
      readonly policyVersion: string;
    }
  | {
      readonly kind: "workload" | "terminal-workload";
      readonly clientId: string;
      readonly consumerId: string;
    };

export interface KeycloakAuthenticationConfig {
  readonly issuer: string;
  readonly authorityId: string;
  readonly authorityIncarnation: string;
  readonly clients: readonly AdmittedKeycloakClient[];
  readonly now?: () => number;
}

export const CLOCK_UNCERTAINTY_SECONDS = 5;
export const ACCESS_TOKEN_LIFETIME_SECONDS = 300;
const PROVIDER_CONTROL_MAX_AGE_MS = 8 * 60 * 60 * 1_000;

const containsDisallowedAscii = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 32 || code === 127) {
      return true;
    }
  }
  return false;
};

const requiredString = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    Buffer.byteLength(value, "utf8") > 256 ||
    containsDisallowedAscii(value)
  ) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  return value;
};

const numericDateMs = (value: unknown): number => {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > Number.MAX_SAFE_INTEGER / 1_000
  ) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  return value * 1_000;
};

const requireScope = (payload: JWTPayload, scope: string): void => {
  if (
    typeof payload.scope !== "string" ||
    payload.scope.length > 2_048 ||
    !payload.scope.split(" ").includes(scope)
  ) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
};

const requireClientKind = (value: unknown): void => {
  if (value !== "human" && value !== "workload" && value !== "terminal-workload") {
    throw new TypeError("Invalid admitted client kind");
  }
};

export const admittedClients = (
  configuration: KeycloakAuthenticationConfig,
): ReadonlyMap<string, AdmittedKeycloakClient> => {
  const issuer = new URL(configuration.issuer);
  const loopback = issuer.hostname === "127.0.0.1" || issuer.hostname === "[::1]";
  if (
    (issuer.protocol !== "https:" && !(issuer.protocol === "http:" && loopback)) ||
    issuer.username !== "" ||
    issuer.password !== "" ||
    issuer.search !== "" ||
    issuer.hash !== "" ||
    configuration.issuer.endsWith("/")
  ) {
    throw new TypeError("Keycloak issuer must be exact HTTPS, or a loopback TEST issuer");
  }
  requiredString(configuration.authorityId);
  requiredString(configuration.authorityIncarnation);
  const clients = new Map<string, AdmittedKeycloakClient>();
  for (const client of configuration.clients) {
    requireClientKind(client.kind);
    requiredString(client.clientId);
    requiredString(client.consumerId);
    if (
      client.kind === "terminal-workload" &&
      !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(client.consumerId)
    ) {
      throw new TypeError("Invalid terminal consumer identity");
    }
    if (clients.has(client.clientId)) {
      throw new TypeError("Duplicate admitted client");
    }
    if (client.kind === "human") {
      requiredString(client.providerControlPolicyId);
      if (!/^[1-9][0-9]{0,8}$/u.test(client.policyVersion)) {
        throw new TypeError("Invalid admission policy version");
      }
    }
    clients.set(client.clientId, Object.freeze({ ...client }));
  }
  if (clients.size === 0 || clients.size > 64) {
    throw new TypeError("Invalid admitted client count");
  }
  return clients;
};

const credentialDates = (payload: JWTPayload, observedAtMs: number, completedAtMs: number) => {
  const issuedAtMs = numericDateMs(payload.iat);
  const expiresAtMs = numericDateMs(payload.exp);
  if (!Number.isSafeInteger(completedAtMs) || completedAtMs < observedAtMs) {
    throw new AuthenticationFailure("UNAVAILABLE");
  }
  if (
    expiresAtMs <= completedAtMs ||
    expiresAtMs <= issuedAtMs ||
    issuedAtMs > observedAtMs + CLOCK_UNCERTAINTY_SECONDS * 1_000 ||
    expiresAtMs - issuedAtMs > ACCESS_TOKEN_LIFETIME_SECONDS * 1_000
  ) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  return { issuedAtMs, expiresAtMs };
};

const humanActor = (
  payload: JWTPayload,
  client: Extract<AdmittedKeycloakClient, { kind: "human" }>,
  configuration: KeycloakAuthenticationConfig,
  observedAtMs: number,
  dates: { readonly issuedAtMs: number; readonly expiresAtMs: number },
): VerifiedHuman => {
  requireScope(payload, "identity.resolve:self");
  const signedInAtMs = numericDateMs(payload.auth_time);
  if (
    signedInAtMs > dates.issuedAtMs + CLOCK_UNCERTAINTY_SECONDS * 1_000 ||
    signedInAtMs > observedAtMs + CLOCK_UNCERTAINTY_SECONDS * 1_000 ||
    observedAtMs - signedInAtMs >= PROVIDER_CONTROL_MAX_AGE_MS
  ) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  return {
    kind: "human",
    authorityId: configuration.authorityId,
    issuer: configuration.issuer,
    subject: requiredString(payload.sub),
    authorityIncarnation: configuration.authorityIncarnation,
    clientId: client.clientId,
    consumerId: client.consumerId,
    authoritySessionId: requiredString(payload.sid),
    signedInAtMs,
    credentialExpiresAtMs: dates.expiresAtMs,
    proof: {
      profile: "provider-session-control-v1",
      authenticatedAtMs: signedInAtMs,
      validUntilMs: Math.min(
        dates.expiresAtMs,
        signedInAtMs + PROVIDER_CONTROL_MAX_AGE_MS,
        observedAtMs + ACCESS_TOKEN_LIFETIME_SECONDS * 1_000,
      ),
      policyVersion: client.policyVersion,
      scope: client.providerControlPolicyId,
    },
  };
};

/** acr/amr and account MFA flags never upgrade the qualified ordinary profile. */
export const normalizeKeycloakActor = (
  payload: JWTPayload,
  clients: ReadonlyMap<string, AdmittedKeycloakClient>,
  configuration: KeycloakAuthenticationConfig,
  observedAtMs: number,
  completedAtMs: number,
): VerifiedActor => {
  if (payload.typ !== "Bearer") {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  requiredString(payload.sub);
  const client = clients.get(requiredString(payload.azp));
  if (client === undefined) {
    throw new AuthenticationFailure("UNAUTHENTICATED");
  }
  const dates = credentialDates(payload, observedAtMs, completedAtMs);
  if (client.kind === "human") {
    return humanActor(payload, client, configuration, observedAtMs, dates);
  }
  requireScope(
    payload,
    client.kind === "terminal-workload" ? "identity.closure:participate" : "identity.status:read",
  );
  return {
    kind: client.kind,
    clientId: client.clientId,
    consumerId: client.consumerId,
    credentialExpiresAtMs: dates.expiresAtMs,
  };
};
