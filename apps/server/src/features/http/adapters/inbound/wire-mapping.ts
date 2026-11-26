import { timestampFromMs } from "@bufbuild/protobuf/wkt";
import {
  AccountEligibility,
  AdmissionProfile,
  type AccountStatusEvidenceSchema,
  type SessionAdmission,
} from "@agent-teams/identity-contracts";
import type { MessageInitShape } from "@bufbuild/protobuf";
import type { AccountStatus, Admission } from "@agent-teams/identity-core";

const eligibility = {
  active: AccountEligibility.ACTIVE,
  suspended: AccountEligibility.SUSPENDED,
  closed: AccountEligibility.CLOSED,
} as const;

export function statusMessage(
  value: AccountStatus,
): MessageInitShape<typeof AccountStatusEvidenceSchema> {
  return {
    account: value.account,
    consumerId: value.consumerId,
    eligibility: eligibility[value.eligibility],
    accountRevision: value.accountRevision,
    securityEpoch: value.securityEpoch,
    authenticationCutoff: timestampFromMs(value.authenticationCutoffMs),
    attachmentGeneration: value.attachmentGeneration,
    reattachmentCutoff: timestampFromMs(value.reattachmentCutoffMs),
    observedAt: timestampFromMs(value.observedAtMs),
    validUntil: timestampFromMs(value.validUntilMs),
  };
}

const profiles = {
  "provider-session-control-v1": AdmissionProfile.PROVIDER_SESSION_CONTROL_V1,
  "independent-continuity-v1": AdmissionProfile.INDEPENDENT_CONTINUITY_V1,
} as const;

export function admissionMessage(
  value: Admission["admission"],
): Omit<SessionAdmission, "$typeName"> {
  const profile = profiles[value.profile];
  if (value.policyVersion !== "1") {
    throw new Error("Unsupported admission policy");
  }
  return {
    authoritySessionId: value.authoritySessionId,
    profile,
    policyId: value.scope,
    policyVersion: 1,
    authenticatedAt: timestampFromMs(value.authenticatedAtMs),
    validUntil: timestampFromMs(value.validUntilMs),
  };
}
