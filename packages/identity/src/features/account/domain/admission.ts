import type { Account, AccountReference } from "./model.js";

export type ProofProfile = "provider-session-control-v1" | "independent-continuity-v1";

export interface StatusEvidence {
  readonly account: AccountReference;
  readonly consumerId: string;
  readonly eligibility: Account["eligibility"];
  readonly accountRevision: bigint;
  readonly securityEpoch: bigint;
  readonly authenticationCutoffMs: number;
  readonly attachmentGeneration: bigint;
  readonly reattachmentCutoffMs: number;
  readonly observedAtMs: number;
  readonly validUntilMs: number;
}

export interface SessionAdmission {
  readonly authoritySessionId: string;
  readonly profile: ProofProfile;
  readonly authenticatedAtMs: number;
  readonly validUntilMs: number;
  readonly policyVersion: string;
  readonly scope: string;
}

export interface SelfAdmission {
  readonly status: StatusEvidence;
  readonly admission: SessionAdmission;
}
