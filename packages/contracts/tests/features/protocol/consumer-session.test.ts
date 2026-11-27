import assert from "node:assert/strict";
import { test } from "node:test";
import { fromJsonString } from "@bufbuild/protobuf";
import {
  AccountStatusEvidenceSchema,
  ResolveSelfResponseSchema,
} from "../../../src/features/protocol/contracts/gen/identity/v1/identity_pb.js";
import {
  IdentityStatusDenied,
  observeConsumerStatus,
  pinConsumerSession,
} from "../../../src/features/protocol/contracts/consumer-status.js";

const policy = {
  clockInstanceId: "one-disposable-process",
  consumerId: "gettok",
  policyId: "gettok-ordinary-login",
  maximumStatusAgeMs: 60_000,
  clockUncertaintyMs: 5_000,
};
const initialStatus = {
  account: {
    accountId: "019abcde-0000-7000-8000-000000000001",
    authorityIncarnation: "realm-1",
  },
  consumerId: "gettok",
  eligibility: "ACCOUNT_ELIGIBILITY_ACTIVE",
  accountRevision: "1",
  securityEpoch: "1",
  authenticationCutoff: "1970-01-01T00:00:00Z",
  attachmentGeneration: "1",
  reattachmentCutoff: "1970-01-01T00:00:00Z",
  observedAt: "2026-11-28T00:00:00Z",
  validUntil: "2026-11-28T00:00:55Z",
};
const baseAdmission = {
  authoritySessionId: "provider-session-1",
  profile: "ADMISSION_PROFILE_PROVIDER_SESSION_CONTROL_V1",
  policyId: "gettok-ordinary-login",
  policyVersion: 1,
  authenticatedAt: "2026-11-27T23:59:59Z",
  validUntil: "2026-11-28T00:04:00Z",
};

const status = (changes: Record<string, string> = {}) =>
  fromJsonString(AccountStatusEvidenceSchema, JSON.stringify({ ...initialStatus, ...changes }));
const response = (changes: Record<string, string> = {}) =>
  fromJsonString(
    ResolveSelfResponseSchema,
    JSON.stringify({ status: initialStatus, admission: { ...baseAdmission, ...changes } }),
  );
const rejects = (run: () => unknown): void => {
  assert.throws(run, IdentityStatusDenied);
};

void test("human admission pins proof separately from renewable status observations", () => {
  const original = pinConsumerSession(response(), policy, 100, 200);
  assert.equal(original.issuedSecurityEpoch, 1n);
  assert.equal(original.issuedAttachmentGeneration, 1n);
  assert.equal(original.proofDeadlineMonotonicMs, 235_100);
  assert.equal(original.statusDeadlineMonotonicMs, 50_100);
  const newer = observeConsumerStatus(
    original,
    status({ observedAt: "2026-11-28T00:00:40Z", validUntil: "2026-11-28T00:01:35Z" }),
    policy,
    40_000,
    40_200,
  );
  assert.equal(newer.statusDeadlineMonotonicMs, 90_100);
  assert.equal(newer.proofDeadlineMonotonicMs, original.proofDeadlineMonotonicMs);
  rejects(() =>
    observeConsumerStatus(
      original,
      status(),
      policy,
      60_000,
      60_100,
    ),
  );
  rejects(() =>
    observeConsumerStatus(
      original,
      status({ observedAt: "2026-11-28T00:00:40Z", validUntil: "2026-11-28T00:01:35Z" }),
      policy,
      100_000,
      100_100,
    ),
  );
  const late = observeConsumerStatus(
    newer,
    status({ observedAt: "2026-11-28T00:03:50Z", validUntil: "2026-11-28T00:04:45Z" }),
    policy,
    230_000,
    230_100,
  );
  assert.equal(late.statusDeadlineMonotonicMs, original.proofDeadlineMonotonicMs);
  rejects(() =>
    observeConsumerStatus(
      late,
      status({ observedAt: "2026-11-28T00:03:51Z", validUntil: "2026-11-28T00:04:46Z" }),
      policy,
      236_000,
      236_100,
    ),
  );
});

void test("status from another consumer or prior account fences never authorizes a session", () => {
  const session = pinConsumerSession(response(), policy, 100, 200);
  rejects(() =>
    observeConsumerStatus(
      session,
      status(),
      { ...policy, clockInstanceId: "new-process-clock" },
      1000,
      1100,
    ),
  );
  for (const changed of [
    { consumerId: "other-product" },
    { accountRevision: "2", securityEpoch: "2" },
    { accountRevision: "2", attachmentGeneration: "2" },
    { eligibility: "ACCOUNT_ELIGIBILITY_SUSPENDED" },
    { eligibility: "ACCOUNT_ELIGIBILITY_CLOSED" },
    { eligibility: 99 },
    { accountRevision: "0" },
    { authenticationCutoff: "2026-11-28T00:00:10Z" },
    { reattachmentCutoff: "2026-11-28T00:00:10Z" },
  ]) {
    rejects(() =>
      observeConsumerStatus(
        session,
        fromJsonString(AccountStatusEvidenceSchema, JSON.stringify({ ...initialStatus, ...changed })),
        policy,
        1000,
        1100,
      ),
    );
  }
  const next = observeConsumerStatus(
    session,
    status({ accountRevision: "2", observedAt: "2026-11-28T00:00:01Z" }),
    policy,
    1000,
    1100,
  );
  rejects(() =>
    observeConsumerStatus(
      next,
      status({ accountRevision: "1", observedAt: "2026-11-28T00:00:02Z" }),
      policy,
      2000,
      2100,
    ),
  );
  rejects(() =>
    observeConsumerStatus(
      next,
      status({
        accountRevision: "2",
        observedAt: "2026-11-28T00:00:02Z",
        authenticationCutoff: "2026-11-28T00:00:01Z",
      }),
      policy,
      2000,
      2100,
    ),
  );
});

void test("unqualified strong profiles and expired, malformed or unbounded proof refuse", () => {
  rejects(() =>
    pinConsumerSession(
      response({ profile: "ADMISSION_PROFILE_INDEPENDENT_CONTINUITY_V1" }),
      policy,
      100,
      200,
    ),
  );
  rejects(() => pinConsumerSession(response({ policyId: "another-policy" }), policy, 100, 200));
  rejects(() => pinConsumerSession(response(), policy, 100, 50));
  rejects(() => pinConsumerSession(response(), policy, 100, 70_000));
  rejects(() =>
    pinConsumerSession(
      fromJsonString(
        ResolveSelfResponseSchema,
        JSON.stringify({
          status: { ...initialStatus, validUntil: "2026-11-28T00:02:00Z" },
          admission: baseAdmission,
        }),
      ),
      policy,
      100,
      200,
    ),
  );
  rejects(() =>
    pinConsumerSession(
      fromJsonString(
        ResolveSelfResponseSchema,
        JSON.stringify({ status: { ...initialStatus, eligibility: 99 }, admission: baseAdmission }),
      ),
      policy,
      100,
      200,
    ),
  );
});
