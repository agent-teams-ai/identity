/** Outbox delivery is internal to a trusted consumer worker, never a public account directory. */
export interface ClaimedAccountEvent {
  readonly eventId: string;
  readonly accountId: string;
  readonly authorityIncarnation: string;
  readonly consumerId: string;
  readonly kind: "account.attached" | "account.eligibility-changed";
  readonly accountRevision: bigint;
  readonly securityEpoch: bigint;
  readonly attachmentGeneration: bigint;
  readonly observedAtMs: number;
  readonly claimGeneration: bigint;
  readonly leaseUntilMs: number;
}

export type ClosureOutcome =
  | "not-provisioned"
  | "erased"
  | "retained-by-policy"
  | "repair-required";

export interface ClosureManifestItem {
  readonly consumerId: string;
  readonly accountId: string;
  readonly authorityIncarnation: string;
  readonly closureRevision: bigint;
  readonly participantGeneration: bigint;
}

export interface ClosureReport extends ClosureManifestItem {
  readonly outcome: ClosureOutcome;
}

/** A leased event can be completed only with the same generation before its deadline. */
export interface AccountOutboxDelivery {
  readonly claimNext: (leaseMs: number) => Promise<ClaimedAccountEvent | undefined>;
  readonly acknowledge: (
    claim: Pick<ClaimedAccountEvent, "eventId" | "claimGeneration">,
  ) => Promise<boolean>;
  /**
   * Terminal-purpose pending manifest only, including previously detached consumers.
   * Read bounded pages by account ID, restart from the beginning for a later sweep.
   * Reads do not settle obligations; duplicate cleanup attempts must be idempotent.
   */
  readonly listPendingClosures: (
    limit: number,
    afterAccountId?: string,
  ) => Promise<readonly ClosureManifestItem[]>;
  /**
   * Unsettled effects remain visible in a separate recipient-scoped repair feed.
   * Reading this feed does not authorize automatic retry or overwrite a receipt.
   */
  readonly listRepairRequiredClosures: (
    limit: number,
    afterAccountId?: string,
  ) => Promise<readonly ClosureManifestItem[]>;
  /**
   * Accepts an exact admitted result or its identical replay; never overwrites a different outcome.
   * Retained-by-policy is reserved until the retention evidence contract is qualified.
   */
  readonly reportClosure: (report: ClosureReport) => Promise<boolean>;
}
