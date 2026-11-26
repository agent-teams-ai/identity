/** Curated capability values; private models evolve independently. */
export interface AccountReference { readonly accountId: string; readonly authorityIncarnation: string; }
export interface HumanAuthority {
  readonly kind: 'human'; readonly authorityId: string; readonly issuer: string; readonly subject: string;
  readonly authorityIncarnation: string; readonly clientId: string; readonly consumerId: string;
  readonly authoritySessionId: string; readonly signedInAtMs: number; readonly credentialExpiresAtMs: number;
  readonly proof: {
    readonly profile: 'provider-session-control-v1' | 'independent-continuity-v1';
    readonly authenticatedAtMs: number; readonly validUntilMs: number; readonly policyVersion: string; readonly scope: string;
  };
}
export interface WorkloadAuthority {
  readonly kind: 'workload'; readonly clientId: string; readonly consumerId: string; readonly credentialExpiresAtMs: number;
}
export interface AccountStatus {
  readonly account: AccountReference; readonly consumerId: string; readonly eligibility: 'active' | 'suspended' | 'closed';
  readonly accountRevision: bigint; readonly securityEpoch: bigint; readonly authenticationCutoffMs: number;
  readonly attachmentGeneration: bigint; readonly reattachmentCutoffMs: number; readonly observedAtMs: number; readonly validUntilMs: number;
}
export interface Admission {
  readonly status: AccountStatus;
  readonly admission: {
    readonly authoritySessionId: string; readonly profile: HumanAuthority['proof']['profile'];
    readonly authenticatedAtMs: number; readonly validUntilMs: number; readonly policyVersion: string; readonly scope: string;
  };
}
export interface AccountApi {
  readonly resolveSelf: (actor: HumanAuthority, idempotencyKey: string) => Promise<Admission>;
  readonly getSelfStatus: (actor: HumanAuthority) => Promise<AccountStatus>;
  readonly getAccountStatus: (actor: WorkloadAuthority, account: AccountReference) => Promise<AccountStatus>;
}
export interface AccountAuthentication {
  readonly authenticate: (bearer: string, signal: AbortSignal) => Promise<HumanAuthority | WorkloadAuthority>;
}
export type FailureReason =
  | 'UNAUTHENTICATED' | 'UNAVAILABLE' | 'PERMISSION_DENIED' | 'INVALID_ARGUMENT' | 'CONFLICT'
  | 'ACCOUNT_SUSPENDED' | 'ACCOUNT_CLOSED' | 'REATTACHMENT_REQUIRED'
  | 'AUTHENTICATION_REQUIRED_AFTER_CUTOFF' | 'INSUFFICIENT_PROOF' | 'RECOVERY_REQUIRED' | 'REPAIR_REQUIRED' | 'ADMISSION_EXPIRED';
export interface AccountFailureValue extends Error { readonly reason: FailureReason; }
export function isAccountFailure(value: unknown): value is AccountFailureValue {
  return value instanceof Error && 'reason' in value && typeof value.reason === 'string'
    && ['UNAUTHENTICATED', 'UNAVAILABLE', 'PERMISSION_DENIED', 'INVALID_ARGUMENT', 'CONFLICT',
      'ACCOUNT_SUSPENDED', 'ACCOUNT_CLOSED', 'REATTACHMENT_REQUIRED', 'AUTHENTICATION_REQUIRED_AFTER_CUTOFF',
      'INSUFFICIENT_PROOF', 'RECOVERY_REQUIRED', 'REPAIR_REQUIRED', 'ADMISSION_EXPIRED'].includes(value.reason);
}
