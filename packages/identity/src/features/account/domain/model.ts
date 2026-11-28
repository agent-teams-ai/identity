export type Eligibility = "active" | "suspended" | "closed";

export interface AccountReference {
  readonly accountId: string;
  readonly authorityIncarnation: string;
}

export interface Account extends AccountReference {
  readonly eligibility: Eligibility;
  readonly revision: bigint;
  readonly securityEpoch: bigint;
  readonly authenticationCutoffMs: number;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
}

export interface AuthoritySubject {
  readonly authorityId: string;
  readonly issuer: string;
  readonly subject: string;
  readonly authorityIncarnation: string;
}

export interface AuthorityBinding extends AuthoritySubject {
  readonly accountId: string;
  readonly revision: bigint;
  readonly state: "active" | "retired";
}

export interface ConsumerAttachment {
  readonly accountId: string;
  readonly consumerId: string;
  readonly generation: bigint;
  readonly revision: bigint;
  readonly state: "active" | "detached";
  readonly reattachmentCutoffMs: number;
  readonly createdAtMs: number;
}

export type AccountFailureReason =
  | "UNAUTHENTICATED"
  | "PERMISSION_DENIED"
  | "INVALID_ARGUMENT"
  | "CONFLICT"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_CLOSED"
  | "REATTACHMENT_REQUIRED"
  | "AUTHENTICATION_REQUIRED_AFTER_CUTOFF"
  | "INSUFFICIENT_PROOF"
  | "RECOVERY_REQUIRED"
  | "REPAIR_REQUIRED"
  | "ADMISSION_EXPIRED";

export class AccountFailure extends Error {
  constructor(readonly reason: AccountFailureReason) {
    super(reason);
    this.name = "AccountFailure";
  }
}

export function requireActive(account: Account): void {
  if (account.eligibility === "closed") {
    throw new AccountFailure("ACCOUNT_CLOSED");
  }
  if (account.eligibility === "suspended") {
    throw new AccountFailure("ACCOUNT_SUSPENDED");
  }
}

export type AccountTransition = "suspend" | "enable" | "global-logout" | "close";

export function transitionAccount(
  account: Account,
  transition: AccountTransition,
  expectedRevision: bigint,
  nowMs: number,
): Account {
  if (account.revision !== expectedRevision) {
    throw new AccountFailure("CONFLICT");
  }
  if (account.eligibility === "closed") {
    throw new AccountFailure("ACCOUNT_CLOSED");
  }
  if (
    (transition === "enable" && account.eligibility !== "suspended") ||
    (transition === "suspend" && account.eligibility !== "active")
  ) {
    throw new AccountFailure("CONFLICT");
  }
  const maximum = 9_223_372_036_854_775_807n;
  if (
    account.revision >= maximum ||
    (transition !== "enable" && account.securityEpoch >= maximum)
  ) {
    throw new AccountFailure("REPAIR_REQUIRED");
  }
  const eligibility =
    transition === "close"
      ? "closed"
      : transition === "suspend"
        ? "suspended"
        : transition === "enable"
          ? "active"
          : account.eligibility;
  return {
    ...account,
    eligibility,
    revision: account.revision + 1n,
    securityEpoch: transition === "enable" ? account.securityEpoch : account.securityEpoch + 1n,
    authenticationCutoffMs:
      transition === "enable"
        ? account.authenticationCutoffMs
        : Math.max(nowMs, account.authenticationCutoffMs),
    updatedAtMs: Math.max(nowMs, account.updatedAtMs),
  };
}
