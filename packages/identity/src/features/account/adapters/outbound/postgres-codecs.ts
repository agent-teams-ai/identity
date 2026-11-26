import type { SelfAdmission } from '../../domain/admission.js';
import { AccountFailure } from '../../domain/model.js';
import type { Account, ConsumerAttachment } from '../../domain/model.js';

export type StoredAccount = {
  account_id: string; authority_incarnation: string; eligibility: Account['eligibility'];
  revision: string; security_epoch: string; authentication_cutoff_ms: string; created_at_ms: string; updated_at_ms: string;
};
export type StoredAttachment = {
  account_id: string; consumer_id: string; generation: string; revision: string;
  state: ConsumerAttachment['state']; reattachment_cutoff_ms: string; created_at_ms: string;
};
export type StoredReceipt = {
  receipt_key: string; consumer_id: string; authority_id: string; issuer: string; subject: string;
  request_fingerprint: string; account_id: string; authority_incarnation: string;
  account_revision: string; security_epoch: string; authentication_cutoff_ms: string;
  attachment_generation: string; reattachment_cutoff_ms: string; observed_at_ms: string; status_valid_until_ms: string;
  authority_session_id: string; proof_profile: SelfAdmission['admission']['profile']; proof_authenticated_at_ms: string;
  proof_valid_until_ms: string; proof_policy_version: string; proof_scope: string;
};

export function milliseconds(value: string): number {
  const number = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(number)) throw new AccountFailure('REPAIR_REQUIRED');
  return number;
}
export function accountOf(row: StoredAccount): Account {
  return {
    accountId: row.account_id, authorityIncarnation: row.authority_incarnation, eligibility: row.eligibility,
    revision: BigInt(row.revision), securityEpoch: BigInt(row.security_epoch),
    authenticationCutoffMs: milliseconds(row.authentication_cutoff_ms),
    createdAtMs: milliseconds(row.created_at_ms), updatedAtMs: milliseconds(row.updated_at_ms),
  };
}
export function attachmentOf(row: StoredAttachment): ConsumerAttachment {
  return {
    accountId: row.account_id, consumerId: row.consumer_id, generation: BigInt(row.generation),
    revision: BigInt(row.revision), state: row.state,
    reattachmentCutoffMs: milliseconds(row.reattachment_cutoff_ms), createdAtMs: milliseconds(row.created_at_ms),
  };
}
export function admissionOf(row: StoredReceipt): SelfAdmission {
  return {
    status: {
      account: { accountId: row.account_id, authorityIncarnation: row.authority_incarnation }, consumerId: row.consumer_id,
      eligibility: 'active', accountRevision: BigInt(row.account_revision), securityEpoch: BigInt(row.security_epoch),
      authenticationCutoffMs: milliseconds(row.authentication_cutoff_ms), attachmentGeneration: BigInt(row.attachment_generation),
      reattachmentCutoffMs: milliseconds(row.reattachment_cutoff_ms), observedAtMs: milliseconds(row.observed_at_ms),
      validUntilMs: milliseconds(row.status_valid_until_ms),
    },
    admission: {
      authoritySessionId: row.authority_session_id, profile: row.proof_profile,
      authenticatedAtMs: milliseconds(row.proof_authenticated_at_ms), validUntilMs: milliseconds(row.proof_valid_until_ms),
      policyVersion: row.proof_policy_version, scope: row.proof_scope,
    },
  };
}
