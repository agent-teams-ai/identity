import type { ProofProfile } from "./admission.js";
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
