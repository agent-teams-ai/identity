import type { Account, AuthorityBinding, AuthoritySubject, ConsumerAttachment } from '../../domain/model.js';
import type { SelfAdmission } from '../../domain/admission.js';

export interface ResolutionReceipt {
  readonly key: string;
  readonly consumerId: string;
  readonly authority: AuthoritySubject;
  readonly requestFingerprint: string;
  readonly admission: SelfAdmission;
}
export interface AccountAudit {
  readonly id: string;
  readonly accountId: string;
  readonly consumerId: string | null;
  readonly action: string;
  readonly accountRevision: bigint;
  readonly observedAtMs: number;
}
export interface AccountEvent {
  readonly id: string;
  readonly accountId: string;
  readonly consumerId: string;
  readonly kind: 'account.attached' | 'account.eligibility-changed';
  readonly accountRevision: bigint;
  readonly securityEpoch: bigint;
  readonly attachmentGeneration: bigint;
  readonly observedAtMs: number;
}

/** First attachment, account, receipt, audit and outbox share this transaction. */
export interface AccountTransaction {
  readonly observeTimeMs: () => Promise<number>;
  readonly findBinding: (authority: AuthoritySubject) => Promise<AuthorityBinding | undefined>;
  readonly lockAccount: (accountId: string) => Promise<Account | undefined>;
  readonly createAccount: (account: Account, binding: AuthorityBinding) => Promise<void>;
  readonly saveAccount: (account: Account) => Promise<void>;
  readonly findAttachment: (accountId: string, consumerId: string) => Promise<ConsumerAttachment | undefined>;
  readonly createAttachment: (attachment: ConsumerAttachment) => Promise<void>;
  readonly listAttachments: (accountId: string) => Promise<readonly ConsumerAttachment[]>;
  readonly findResolutionReceipt: (authority: AuthoritySubject, consumerId: string, key: string) => Promise<ResolutionReceipt | undefined>;
  readonly saveResolutionReceipt: (receipt: ResolutionReceipt) => Promise<void>;
  readonly appendAudit: (audit: AccountAudit) => Promise<void>;
  readonly appendEvent: (event: AccountEvent) => Promise<void>;
  readonly captureClosureParticipants: (accountId: string, revision: bigint, atMs: number) => Promise<void>;
}
export interface AccountStore {
  readonly resolveTransaction: <T>(authority: AuthoritySubject, run: (tx: AccountTransaction) => Promise<T>) => Promise<T>;
  readonly transaction: <T>(run: (tx: AccountTransaction) => Promise<T>) => Promise<T>;
}
