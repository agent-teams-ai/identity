import type { SelfAdmission, StatusEvidence } from '../../domain/admission.js';
import type { AdmissionPolicy } from '../../domain/admission-policy.js';
import type { AccountReference, AccountTransition } from '../../domain/model.js';
import type { AccountStore } from './account-store.js';
import type { VerifiedHuman, VerifiedWorkload } from './authentication.js';

export interface AccountApi {
  readonly resolveSelf: (actor: VerifiedHuman, idempotencyKey: string) => Promise<SelfAdmission>;
  readonly getSelfStatus: (actor: VerifiedHuman) => Promise<StatusEvidence>;
  readonly getAccountStatus: (actor: VerifiedWorkload, account: AccountReference) => Promise<StatusEvidence>;
}
export interface AccountAdministration {
  readonly transition: (account: AccountReference, action: AccountTransition, expectedRevision: bigint) => Promise<void>;
}
export interface AccountDependencies {
  readonly store: AccountStore;
  readonly newId: () => string;
  readonly policy: AdmissionPolicy;
}
