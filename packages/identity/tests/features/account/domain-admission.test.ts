import assert from "node:assert/strict";
import { test } from "node:test";
import {
  statusOf,
  validateAdmission,
  type AdmissionObservation,
} from "../../../src/features/account/domain/admission-policy.js";
import { AccountFailure, transitionAccount } from "../../../src/features/account/domain/model.js";
import type { VerifiedHuman } from "../../../src/features/account/domain/authority.js";
import { readAdmissionSpecification } from "./admission-specification.js";

const specification = await readAdmissionSpecification();

const account = {
  accountId: "019abcde-0000-7000-8000-000000000001",
  authorityIncarnation: "test-realm-1",
  eligibility: "active" as const,
  revision: 9_007_199_254_740_995n,
  securityEpoch: 9_007_199_254_740_993n,
  authenticationCutoffMs: 0,
  createdAtMs: 10_000,
  updatedAtMs: 10_000,
};
const observation: AdmissionObservation = {
  account,
  attachment: {
    accountId: account.accountId,
    consumerId: "gettok",
    generation: 9_007_199_254_740_997n,
    revision: 1n,
    state: "active",
    reattachmentCutoffMs: 0,
    createdAtMs: 20_000,
  },
  observedAtMs: 100_000,
  credentialExpiresAtMs: 300_000,
  policy: { statusBudgetMs: 60_000, maximumClockSkewMs: 5_000, allowedProofPolicyVersions: ["1"] },
};
const actor: VerifiedHuman = {
  kind: "human",
  authorityId: "primary",
  issuer: "https://identity.test/realms/test",
  subject: "human-1",
  authorityIncarnation: account.authorityIncarnation,
  consumerId: "gettok",
  clientId: "gettok-web",
  authoritySessionId: "session-1",
  signedInAtMs: 95_001,
  credentialExpiresAtMs: 300_000,
  proof: {
    profile: "provider-session-control-v1",
    authenticatedAtMs: 95_001,
    validUntilMs: 250_000,
    policyVersion: "1",
    scope: "gettok.personal",
  },
};
const reason =
  (value: string) =>
  (error: unknown): boolean =>
    error instanceof AccountFailure && error.reason === value;

await test("status preserves large counters and spends clock uncertainty inside its fixed lifetime", () => {
  const result = statusOf(observation);
  assert.equal(result.accountRevision, 9_007_199_254_740_995n);
  assert.equal(result.attachmentGeneration, 9_007_199_254_740_997n);
  assert.equal(result.validUntilMs, 155_000);
  assert.equal(statusOf({ ...observation, credentialExpiresAtMs: 125_000 }).validUntilMs, 120_000);
  assert.throws(
    () => statusOf({ ...observation, observedAtMs: 19_999 }),
    reason("REPAIR_REQUIRED"),
  );
  assert.throws(
    () => statusOf({ ...observation, credentialExpiresAtMs: 105_000 }),
    reason("UNAUTHENTICATED"),
  );
  for (const observedAtMs of specification.observedAtMs) {
    for (const lifetimeMs of specification.credentialLifetimesMs) {
      const credentialExpiresAtMs = observedAtMs + lifetimeMs;
      const status = statusOf({ ...observation, observedAtMs, credentialExpiresAtMs });
      assert.ok(status.validUntilMs > observedAtMs);
      assert.ok(status.validUntilMs <= observedAtMs + 55_000);
      assert.ok(status.validUntilMs <= credentialExpiresAtMs - 5_000);
      assert.equal(status.securityEpoch, account.securityEpoch);
      assert.equal(status.attachmentGeneration, observation.attachment.generation);
    }
  }
});

await test("re-entry requires proof strictly newer than each cutoff including uncertainty", () => {
  const revoked = { ...observation, account: { ...account, authenticationCutoffMs: 90_000 } };
  assert.throws(() => {
    validateAdmission({ ...actor, signedInAtMs: 95_000 }, revoked);
  }, reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"));
  validateAdmission(actor, revoked);
  assert.throws(() => {
    validateAdmission(
      { ...actor, proof: { ...actor.proof, profile: "independent-continuity-v1" } },
      observation,
    );
  }, reason("INSUFFICIENT_PROOF"));
  assert.throws(() => {
    validateAdmission(actor, {
      ...revoked,
      attachment: { ...observation.attachment, reattachmentCutoffMs: 95_000 },
    });
  }, reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"));
  assert.throws(() => {
    validateAdmission({ ...actor, proof: { ...actor.proof, validUntilMs: 105_000 } }, observation);
  }, reason("INSUFFICIENT_PROOF"));
  assert.throws(() => {
    validateAdmission({ ...actor, proof: { ...actor.proof, policyVersion: "2" } }, observation);
  }, reason("INSUFFICIENT_PROOF"));
  for (const authenticationCutoffMs of specification.accountCutoffsMs) {
    for (const reattachmentCutoffMs of specification.reattachmentCutoffsMs) {
      const bounded = {
        ...observation,
        account: { ...account, authenticationCutoffMs },
        attachment: { ...observation.attachment, reattachmentCutoffMs },
      };
      for (const offsetMs of specification.cutoffOffsetsMs) {
        const signedInAtMs =
          Math.max(authenticationCutoffMs, reattachmentCutoffMs) + 5_000 + offsetMs;
        const invoke = (): void => {
          validateAdmission({ ...actor, signedInAtMs }, bounded);
        };
        if (offsetMs <= 0) {
          assert.throws(invoke, reason("AUTHENTICATION_REQUIRED_AFTER_CUTOFF"));
        } else {
          assert.doesNotThrow(invoke);
        }
      }
    }
  }
});

await test("enable cannot restore an old epoch; closure and exhausted counters remain terminal", () => {
  const suspended = transitionAccount(account, "suspend", account.revision, 100_000);
  const enabled = transitionAccount(suspended, "enable", suspended.revision, 110_000);
  assert.equal(enabled.eligibility, "active");
  assert.equal(enabled.securityEpoch, account.securityEpoch + 1n);
  assert.equal(enabled.authenticationCutoffMs, 100_000);
  assert.throws(
    () => transitionAccount(enabled, "close", account.revision, 120_000),
    reason("CONFLICT"),
  );
  const closed = transitionAccount(enabled, "close", enabled.revision, 120_000);
  assert.throws(
    () => transitionAccount(closed, "enable", closed.revision, 130_000),
    reason("ACCOUNT_CLOSED"),
  );
  const maximum = { ...account, revision: 9_223_372_036_854_775_807n };
  assert.throws(
    () => transitionAccount(maximum, "global-logout", maximum.revision, 140_000),
    reason("REPAIR_REQUIRED"),
  );
  for (const securityEpoch of specification.transitionEpochs) {
    for (const authenticationCutoffMs of specification.transitionCutoffsMs) {
      const initial = { ...account, securityEpoch, authenticationCutoffMs };
      const revoked = transitionAccount(initial, "suspend", initial.revision, 100_000);
      const restored = transitionAccount(revoked, "enable", revoked.revision, 110_000);
      assert.equal(restored.securityEpoch, securityEpoch + 1n);
      assert.equal(restored.authenticationCutoffMs, Math.max(authenticationCutoffMs, 100_000));
      const terminal = transitionAccount(restored, "close", restored.revision, 120_000);
      assert.throws(
        () => transitionAccount(terminal, "enable", terminal.revision, 130_000),
        reason("ACCOUNT_CLOSED"),
      );
    }
  }
});
