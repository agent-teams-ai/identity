import type { ProofProfile } from "./admission.js";
import { AccountFailure } from "./model.js";
import type { AuthoritySubject } from "./model.js";

/** Qualified observations, never claims accepted directly from a caller. */
export interface VerifiedHuman extends AuthoritySubject {
  readonly kind: "human";
  readonly clientId: string;
  readonly consumerId: string;
  readonly authoritySessionId: string;
  readonly signedInAtMs: number;
  readonly credentialExpiresAtMs: number;
  readonly proof: {
    readonly profile: ProofProfile;
    readonly authenticatedAtMs: number;
    readonly validUntilMs: number;
    readonly policyVersion: string;
    readonly scope: string;
  };
}

export interface VerifiedWorkload {
  readonly kind: "workload";
  readonly clientId: string;
  readonly consumerId: string;
  readonly credentialExpiresAtMs: number;
}

export interface VerifiedTerminalWorkload {
  readonly kind: "terminal-workload";
  readonly clientId: string;
  readonly consumerId: string;
  readonly credentialExpiresAtMs: number;
}

export type VerifiedActor = VerifiedHuman | VerifiedWorkload | VerifiedTerminalWorkload;

export function validateTerminalAuthority(actor: VerifiedTerminalWorkload): void {
  if (
    actor.kind !== "terminal-workload" ||
    !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(actor.consumerId)
  ) {
    throw new AccountFailure("PERMISSION_DENIED");
  }
  if (!Number.isSafeInteger(actor.credentialExpiresAtMs) || actor.credentialExpiresAtMs <= 0) {
    throw new AccountFailure("UNAUTHENTICATED");
  }
}
