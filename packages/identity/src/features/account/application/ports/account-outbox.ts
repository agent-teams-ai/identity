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

/** A leased event can be completed only with the same generation before its deadline. */
export interface AccountOutboxDelivery {
  readonly claimNext: (leaseMs: number) => Promise<ClaimedAccountEvent | undefined>;
  readonly acknowledge: (
    claim: Pick<ClaimedAccountEvent, "eventId" | "claimGeneration">,
  ) => Promise<boolean>;
}
