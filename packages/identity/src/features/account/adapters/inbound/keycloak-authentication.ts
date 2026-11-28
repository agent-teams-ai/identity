import { errors, jwtVerify } from "jose";
import {
  AuthenticationFailure,
  type AuthenticationPort,
} from "../../application/ports/authentication.js";
import { createKeycloakJwks } from "./keycloak-jwks.js";
import {
  admittedClients,
  CLOCK_UNCERTAINTY_SECONDS,
  normalizeKeycloakActor,
  type AdmittedKeycloakClient,
  type KeycloakAuthenticationConfig,
} from "./keycloak-profile.js";

export type { AdmittedKeycloakClient, KeycloakAuthenticationConfig } from "./keycloak-profile.js";

const MAX_TOKEN_BYTES = 8_192;

const isCredentialFailure = (error: unknown): boolean =>
  error instanceof errors.JWTExpired ||
  error instanceof errors.JWTClaimValidationFailed ||
  error instanceof errors.JWSInvalid ||
  error instanceof errors.JWTInvalid ||
  error instanceof errors.JOSEAlgNotAllowed ||
  error instanceof errors.JWSSignatureVerificationFailed ||
  error instanceof errors.JWKSNoMatchingKey ||
  error instanceof errors.JWKSMultipleMatchingKeys;

interface VerifierContext {
  readonly configuration: KeycloakAuthenticationConfig;
  readonly clients: ReadonlyMap<string, AdmittedKeycloakClient>;
  readonly jwks: ReturnType<typeof createKeycloakJwks>;
  readonly now: () => number;
}

const authenticate = async (context: VerifierContext, bearer: string, signal: AbortSignal) => {
  try {
    signal.throwIfAborted();
    if (bearer.length === 0 || Buffer.byteLength(bearer, "utf8") > MAX_TOKEN_BYTES) {
      throw new AuthenticationFailure("UNAUTHENTICATED");
    }
    const observedAtMs = context.now();
    if (!Number.isSafeInteger(observedAtMs) || observedAtMs <= 0) {
      throw new AuthenticationFailure("UNAVAILABLE");
    }
    const { payload } = await jwtVerify(bearer, context.jwks, {
      issuer: context.configuration.issuer,
      audience: "identity-api",
      algorithms: ["RS256"],
      requiredClaims: ["iss", "sub", "aud", "exp", "iat", "azp", "typ"],
      clockTolerance: CLOCK_UNCERTAINTY_SECONDS,
      currentDate: new Date(observedAtMs),
    });
    signal.throwIfAborted();
    return normalizeKeycloakActor(
      payload,
      context.clients,
      context.configuration,
      observedAtMs,
      context.now(),
    );
  } catch (error) {
    if (error instanceof AuthenticationFailure) {
      throw error;
    }
    throw new AuthenticationFailure(isCredentialFailure(error) ? "UNAUTHENTICATED" : "UNAVAILABLE");
  }
};

/** The stronger profile remains unavailable until native provenance qualifies. */
export const createKeycloakAuthentication = (
  configuration: KeycloakAuthenticationConfig,
): AuthenticationPort => {
  const stable = { ...configuration, clients: [...configuration.clients] };
  const context: VerifierContext = {
    configuration: stable,
    clients: admittedClients(stable),
    jwks: createKeycloakJwks(stable.issuer),
    now: stable.now ?? Date.now,
  };
  return { authenticate: async (bearer, signal) => authenticate(context, bearer, signal) };
};
