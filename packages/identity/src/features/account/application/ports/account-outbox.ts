/** Outbox delivery is internal to a trusted consumer worker, never a public account directory. */
export interface ClaimedAccountEvent {
  readonly eventId: string;
  readonly accountId: string;
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

export interface ClosureReport {
  readonly accountId: string;
  readonly closureRevision: bigint;
  readonly participantGeneration: bigint;
  readonly outcome: ClosureOutcome;
}

/** A leased event can be completed only with the same generation before its deadline. */
export interface AccountOutboxDelivery {
  readonly claimNext: (leaseMs: number) => Promise<ClaimedAccountEvent | undefined>;
  readonly acknowledge: (
    claim: Pick<ClaimedAccountEvent, "eventId" | "claimGeneration">,
  ) => Promise<boolean>;
  /** Records one trusted recipient's result; it does not prove whole-account erasure. */
  readonly reportClosure: (report: ClosureReport) => Promise<boolean>;
}
