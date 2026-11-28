import type { Timestamp } from "@bufbuild/protobuf/wkt";
import { AccountEligibility, AdmissionProfile } from "./gen/identity/v1/identity_pb.js";
import type { AccountStatusEvidence, ResolveSelfResponse } from "./gen/identity/v1/identity_pb.js";

/** Immutable human-login facts; workload status never renews the original proof. */
export interface PinnedConsumerSession {
  readonly accountId: string;
  readonly authorityIncarnation: string;
  readonly consumerId: string;
  readonly authoritySessionId: string;
  readonly policyId: string;
  readonly proofAuthenticatedAtMs: number;
  readonly clockInstanceId: string;
  readonly clockAnchorObservedAtMs: number;
  readonly clockAnchorRequestStartedMonotonicMs: number;
  readonly issuedSecurityEpoch: bigint;
  readonly issuedAttachmentGeneration: bigint;
  readonly proofDeadlineMonotonicMs: number;
  readonly statusDeadlineMonotonicMs: number;
  readonly lastRevision: bigint;
  readonly lastObservedAtMs: number;
  readonly lastAuthenticationCutoffMs: number;
  readonly lastReattachmentCutoffMs: number;
}

export interface ConsumerEvidencePolicy {
  /** A fresh nonpersisted identifier generated on each process/clock instance start. */
  readonly clockInstanceId: string;
  readonly consumerId: string;
  readonly policyId: string;
  readonly maximumStatusAgeMs: number;
  readonly clockUncertaintyMs: number;
}

/** Never expose untrusted authority state or token data in denial diagnostics. */
export class IdentityStatusDenied extends Error {
  constructor() {
    super("Identity status denied");
    this.name = "IdentityStatusDenied";
  }
}

function deny(): never {
  throw new IdentityStatusDenied();
}

function ms(value: Timestamp | undefined): number {
  if (
    value === undefined ||
    value.seconds < 0n ||
    !Number.isInteger(value.nanos) ||
    value.nanos < 0 ||
    value.nanos >= 1_000_000_000
  ) {
    return deny();
  }
  const result = value.seconds * 1_000n + BigInt(Math.floor(value.nanos / 1_000_000));
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
    return deny();
  }
  return Number(result);
}

function policyOf(policy: ConsumerEvidencePolicy): void {
  if (
    !policy.consumerId ||
    !policy.policyId ||
    !policy.clockInstanceId ||
    policy.clockInstanceId.length > 128 ||
    !Number.isSafeInteger(policy.maximumStatusAgeMs) ||
    policy.maximumStatusAgeMs <= 0 ||
    policy.maximumStatusAgeMs > 60_000 ||
    !Number.isSafeInteger(policy.clockUncertaintyMs) ||
    policy.clockUncertaintyMs < 0 ||
    policy.clockUncertaintyMs >= policy.maximumStatusAgeMs
  ) {
    return deny();
  }
}

function monotonic(requestStartedMs: number, receivedMs: number): void {
  if (
    !Number.isFinite(requestStartedMs) ||
    !Number.isFinite(receivedMs) ||
    requestStartedMs < 0 ||
    receivedMs < requestStartedMs
  ) {
    return deny();
  }
}

interface BoundStatus {
  readonly accountId: string;
  readonly authorityIncarnation: string;
  readonly observedMs: number;
  readonly validUntilMs: number;
  readonly authenticationCutoffMs: number;
  readonly reattachmentCutoffMs: number;
}

function statusOf(status: AccountStatusEvidence, policy: ConsumerEvidencePolicy): BoundStatus {
  if (
    status.account === undefined ||
    !status.account.accountId ||
    !status.account.authorityIncarnation ||
    status.consumerId !== policy.consumerId ||
    status.eligibility !== AccountEligibility.ACTIVE ||
    status.accountRevision <= 0n ||
    status.securityEpoch <= 0n ||
    status.attachmentGeneration <= 0n
  ) {
    return deny();
  }
  const observedMs = ms(status.observedAt);
  const validUntilMs = ms(status.validUntil);
  const authenticationCutoffMs = ms(status.authenticationCutoff);
  const reattachmentCutoffMs = ms(status.reattachmentCutoff);
  const age = validUntilMs - observedMs;
  if (age <= policy.clockUncertaintyMs || age > policy.maximumStatusAgeMs) {
    return deny();
  }
  return {
    accountId: status.account.accountId,
    authorityIncarnation: status.account.authorityIncarnation,
    observedMs,
    validUntilMs,
    authenticationCutoffMs,
    reattachmentCutoffMs,
  };
}

/** Only the authenticated human ResolveSelf operation may establish this pin. */
export function pinConsumerSession(
  response: ResolveSelfResponse,
  policy: ConsumerEvidencePolicy,
  requestStartedMonotonicMs: number,
  receivedMonotonicMs: number,
): PinnedConsumerSession {
  policyOf(policy);
  monotonic(requestStartedMonotonicMs, receivedMonotonicMs);
  const { status, admission } = response;
  if (
    status === undefined ||
    admission === undefined ||
    admission.profile !== AdmissionProfile.PROVIDER_SESSION_CONTROL_V1 ||
    !admission.authoritySessionId ||
    admission.policyId !== policy.policyId ||
    admission.policyVersion <= 0 ||
    admission.policyVersion > 999_999_999
  ) {
    return deny();
  }
  const bounds = statusOf(status, policy);
  const proofAuthenticatedAtMs = ms(admission.authenticatedAt);
  const proofValidUntilMs = ms(admission.validUntil);
  if (
    proofAuthenticatedAtMs > bounds.observedMs + policy.clockUncertaintyMs ||
    proofAuthenticatedAtMs <=
      Math.max(bounds.authenticationCutoffMs, bounds.reattachmentCutoffMs) +
        policy.clockUncertaintyMs ||
    proofValidUntilMs <= bounds.observedMs + policy.clockUncertaintyMs ||
    proofValidUntilMs - bounds.observedMs > 300_000
  ) {
    return deny();
  }
  const proofDeadlineMonotonicMs =
    requestStartedMonotonicMs + proofValidUntilMs - bounds.observedMs - policy.clockUncertaintyMs;
  const statusDeadlineMonotonicMs =
    requestStartedMonotonicMs + bounds.validUntilMs - bounds.observedMs - policy.clockUncertaintyMs;
  if (receivedMonotonicMs >= Math.min(proofDeadlineMonotonicMs, statusDeadlineMonotonicMs)) {
    return deny();
  }
  return Object.freeze({
    accountId: bounds.accountId,
    authorityIncarnation: bounds.authorityIncarnation,
    consumerId: status.consumerId,
    authoritySessionId: admission.authoritySessionId,
    policyId: admission.policyId,
    proofAuthenticatedAtMs,
    clockInstanceId: policy.clockInstanceId,
    clockAnchorObservedAtMs: bounds.observedMs,
    clockAnchorRequestStartedMonotonicMs: requestStartedMonotonicMs,
    issuedSecurityEpoch: status.securityEpoch,
    issuedAttachmentGeneration: status.attachmentGeneration,
    proofDeadlineMonotonicMs,
    statusDeadlineMonotonicMs,
    lastRevision: status.accountRevision,
    lastObservedAtMs: bounds.observedMs,
    lastAuthenticationCutoffMs: bounds.authenticationCutoffMs,
    lastReattachmentCutoffMs: bounds.reattachmentCutoffMs,
  });
}

function matchesIssuedSession(
  session: PinnedConsumerSession,
  status: AccountStatusEvidence,
  policy: ConsumerEvidencePolicy,
  requestStartedMonotonicMs: number,
): boolean {
  if (status.account === undefined) {
    return false;
  }
  return (
    session.consumerId === policy.consumerId &&
    session.policyId === policy.policyId &&
    session.clockInstanceId === policy.clockInstanceId &&
    requestStartedMonotonicMs >= session.clockAnchorRequestStartedMonotonicMs &&
    status.account.accountId === session.accountId &&
    status.account.authorityIncarnation === session.authorityIncarnation &&
    status.securityEpoch === session.issuedSecurityEpoch &&
    status.attachmentGeneration === session.issuedAttachmentGeneration &&
    status.accountRevision >= session.lastRevision
  );
}

/** Workload status updates freshness, not the original human proof or issued fences. */
export function observeConsumerStatus(
  session: PinnedConsumerSession,
  status: AccountStatusEvidence,
  policy: ConsumerEvidencePolicy,
  requestStartedMonotonicMs: number,
  receivedMonotonicMs: number,
): PinnedConsumerSession {
  policyOf(policy);
  monotonic(requestStartedMonotonicMs, receivedMonotonicMs);
  if (!matchesIssuedSession(session, status, policy, requestStartedMonotonicMs)) {
    return deny();
  }
  const bounds = statusOf(status, policy);
  if (
    bounds.observedMs < session.lastObservedAtMs ||
    bounds.observedMs >
      session.clockAnchorObservedAtMs +
        receivedMonotonicMs -
        session.clockAnchorRequestStartedMonotonicMs +
        policy.clockUncertaintyMs ||
    bounds.authenticationCutoffMs < session.lastAuthenticationCutoffMs ||
    bounds.reattachmentCutoffMs < session.lastReattachmentCutoffMs ||
    session.proofAuthenticatedAtMs <=
      Math.max(bounds.authenticationCutoffMs, bounds.reattachmentCutoffMs) +
        policy.clockUncertaintyMs ||
    (status.accountRevision === session.lastRevision &&
      (bounds.authenticationCutoffMs !== session.lastAuthenticationCutoffMs ||
        bounds.reattachmentCutoffMs !== session.lastReattachmentCutoffMs))
  ) {
    return deny();
  }
  const statusDeadlineMonotonicMs = Math.min(
    session.proofDeadlineMonotonicMs,
    session.clockAnchorRequestStartedMonotonicMs +
      bounds.validUntilMs -
      session.clockAnchorObservedAtMs -
      policy.clockUncertaintyMs,
  );
  if (
    receivedMonotonicMs >= session.proofDeadlineMonotonicMs ||
    receivedMonotonicMs >= statusDeadlineMonotonicMs
  ) {
    return deny();
  }
  return Object.freeze({
    ...session,
    statusDeadlineMonotonicMs,
    lastRevision: status.accountRevision,
    lastObservedAtMs: bounds.observedMs,
    lastAuthenticationCutoffMs: bounds.authenticationCutoffMs,
    lastReattachmentCutoffMs: bounds.reattachmentCutoffMs,
  });
}
