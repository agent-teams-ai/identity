import type { SelfAdmission, StatusEvidence } from "./admission.js";
import type { VerifiedHuman } from "./authority.js";
import { AccountFailure, requireActive } from "./model.js";
import type { Account, AccountReference, ConsumerAttachment } from "./model.js";

export interface AdmissionPolicy {
  readonly statusBudgetMs: number;
  readonly maximumClockSkewMs: number;
  readonly allowedProofPolicyVersions: readonly string[];
}

export interface AdmissionObservation {
  readonly account: Account;
  readonly attachment: ConsumerAttachment;
  readonly observedAtMs: number;
  readonly credentialExpiresAtMs: number;
  readonly policy: AdmissionPolicy;
}

export function validatePolicy(policy: AdmissionPolicy): void {
  if (
    !Number.isSafeInteger(policy.statusBudgetMs) ||
    policy.statusBudgetMs <= 0 ||
    policy.statusBudgetMs > 60_000 ||
    !Number.isSafeInteger(policy.maximumClockSkewMs) ||
    policy.maximumClockSkewMs < 0 ||
    policy.maximumClockSkewMs >= policy.statusBudgetMs ||
    policy.allowedProofPolicyVersions.length === 0
  ) {
    throw new Error("Invalid bounded admission policy");
  }
}

export function requireLiveCredential(expiresAtMs: number, nowMs: number, skewMs: number): void {
  if (!Number.isSafeInteger(expiresAtMs) || expiresAtMs <= nowMs + skewMs) {
    throw new AccountFailure("UNAUTHENTICATED");
  }
}

export function validateReference(reference: AccountReference): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(reference.accountId) ||
    reference.authorityIncarnation.length < 1 ||
    reference.authorityIncarnation.length > 128
  ) {
    throw new AccountFailure("INVALID_ARGUMENT");
  }
}

export function requestFingerprint(actor: VerifiedHuman): string {
  return JSON.stringify([
    actor.authorityId,
    actor.issuer,
    actor.subject,
    actor.authorityIncarnation,
    actor.clientId,
    actor.consumerId,
    actor.authoritySessionId,
    actor.signedInAtMs,
    actor.proof.profile,
    actor.proof.authenticatedAtMs,
    actor.proof.policyVersion,
    actor.proof.scope,
  ]);
}

export function statusOf(observation: AdmissionObservation): StatusEvidence {
  const { account, attachment, observedAtMs, credentialExpiresAtMs, policy } = observation;
  requireLiveCredential(credentialExpiresAtMs, observedAtMs, policy.maximumClockSkewMs);
  if (observedAtMs < Math.max(account.updatedAtMs, attachment.createdAtMs)) {
    throw new AccountFailure("REPAIR_REQUIRED");
  }
  return {
    account: { accountId: account.accountId, authorityIncarnation: account.authorityIncarnation },
    consumerId: attachment.consumerId,
    eligibility: account.eligibility,
    accountRevision: account.revision,
    securityEpoch: account.securityEpoch,
    authenticationCutoffMs: account.authenticationCutoffMs,
    attachmentGeneration: attachment.generation,
    reattachmentCutoffMs: attachment.reattachmentCutoffMs,
    observedAtMs,
    validUntilMs:
      Math.min(observedAtMs + policy.statusBudgetMs, credentialExpiresAtMs) -
      policy.maximumClockSkewMs,
  };
}

export function validateAdmission(actor: VerifiedHuman, observation: AdmissionObservation): void {
  const { account, attachment, observedAtMs: nowMs, policy } = observation;
  requireActive(account);
  requireLiveCredential(actor.credentialExpiresAtMs, nowMs, policy.maximumClockSkewMs);
  const cutoff = Math.max(account.authenticationCutoffMs, attachment.reattachmentCutoffMs);
  if (
    !Number.isSafeInteger(actor.signedInAtMs) ||
    actor.signedInAtMs > nowMs + policy.maximumClockSkewMs ||
    (cutoff > 0 && actor.signedInAtMs <= cutoff + policy.maximumClockSkewMs)
  ) {
    throw new AccountFailure("AUTHENTICATION_REQUIRED_AFTER_CUTOFF");
  }
  if (
    !actor.authoritySessionId ||
    !actor.proof.scope ||
    !policy.allowedProofPolicyVersions.includes(actor.proof.policyVersion) ||
    !Number.isSafeInteger(actor.proof.authenticatedAtMs) ||
    actor.proof.authenticatedAtMs > nowMs + policy.maximumClockSkewMs ||
    !Number.isSafeInteger(actor.proof.validUntilMs) ||
    actor.proof.validUntilMs <= nowMs + policy.maximumClockSkewMs
  ) {
    throw new AccountFailure("INSUFFICIENT_PROOF");
  }
}

export function selfAdmissionOf(
  actor: VerifiedHuman,
  observation: AdmissionObservation,
): SelfAdmission {
  return {
    status: statusOf(observation),
    admission: {
      authoritySessionId: actor.authoritySessionId,
      profile: actor.proof.profile,
      authenticatedAtMs: actor.proof.authenticatedAtMs,
      validUntilMs:
        Math.min(actor.proof.validUntilMs, actor.credentialExpiresAtMs) -
        observation.policy.maximumClockSkewMs,
      policyVersion: actor.proof.policyVersion,
      scope: actor.proof.scope,
    },
  };
}
