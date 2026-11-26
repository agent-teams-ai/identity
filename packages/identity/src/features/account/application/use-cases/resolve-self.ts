import type { SelfAdmission } from "../../domain/admission.js";
import {
  requestFingerprint,
  requireLiveCredential,
  selfAdmissionOf,
  validateAdmission,
} from "../../domain/admission-policy.js";
import type { AdmissionObservation } from "../../domain/admission-policy.js";
import { AccountFailure, requireActive } from "../../domain/model.js";
import type { Account, ConsumerAttachment } from "../../domain/model.js";
import type { AccountDependencies } from "../ports/account-api.js";
import type { AccountTransaction } from "../ports/account-store.js";
import type { VerifiedHuman } from "../ports/authentication.js";
import { readBoundAccount } from "./read-bound-account.js";

interface ResolutionContext {
  readonly tx: AccountTransaction;
  readonly deps: AccountDependencies;
  readonly actor: VerifiedHuman;
  readonly key: string;
}

async function resolveAccount(context: ResolutionContext): Promise<Account> {
  const { tx, deps, actor } = context;
  if (await tx.findBinding(actor)) {
    return readBoundAccount(tx, actor);
  }
  const nowMs = await tx.observeTimeMs();
  requireLiveCredential(actor.credentialExpiresAtMs, nowMs, deps.policy.maximumClockSkewMs);
  const account: Account = {
    accountId: deps.newId(),
    authorityIncarnation: actor.authorityIncarnation,
    eligibility: "active",
    revision: 1n,
    securityEpoch: 1n,
    authenticationCutoffMs: 0,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
  await tx.createAccount(account, {
    authorityId: actor.authorityId,
    issuer: actor.issuer,
    subject: actor.subject,
    authorityIncarnation: actor.authorityIncarnation,
    accountId: account.accountId,
    revision: 1n,
    state: "active",
  });
  return account;
}

function freshAttachment(
  account: Account,
  actor: VerifiedHuman,
  nowMs: number,
): ConsumerAttachment {
  return {
    accountId: account.accountId,
    consumerId: actor.consumerId,
    generation: 1n,
    revision: 1n,
    state: "active",
    reattachmentCutoffMs: 0,
    createdAtMs: nowMs,
  };
}

async function previousAdmission(
  context: ResolutionContext,
  observation: AdmissionObservation,
): Promise<SelfAdmission | undefined> {
  const { tx, actor, key } = context;
  const previous = await tx.findResolutionReceipt(actor, actor.consumerId, key);
  if (!previous) {
    return undefined;
  }
  if (previous.requestFingerprint !== requestFingerprint(actor)) {
    throw new AccountFailure("CONFLICT");
  }
  const { status, admission } = previous.admission;
  if (
    status.securityEpoch !== observation.account.securityEpoch ||
    status.attachmentGeneration !== observation.attachment.generation ||
    status.validUntilMs <= observation.observedAtMs ||
    admission.validUntilMs <= observation.observedAtMs
  ) {
    throw new AccountFailure("ADMISSION_EXPIRED");
  }
  return previous.admission;
}

async function attachConsumer(
  context: ResolutionContext,
  observation: AdmissionObservation,
): Promise<void> {
  const { tx, deps, actor } = context;
  await tx.createAttachment(observation.attachment);
  await tx.appendEvent({
    id: deps.newId(),
    accountId: observation.account.accountId,
    consumerId: actor.consumerId,
    kind: "account.attached",
    accountRevision: observation.account.revision,
    securityEpoch: observation.account.securityEpoch,
    attachmentGeneration: observation.attachment.generation,
    observedAtMs: observation.observedAtMs,
  });
}

async function commitAdmission(
  context: ResolutionContext,
  observation: AdmissionObservation,
): Promise<SelfAdmission> {
  const { tx, actor, deps, key } = context;
  const admission = selfAdmissionOf(actor, observation);
  await tx.saveResolutionReceipt({
    key,
    consumerId: actor.consumerId,
    authority: actor,
    requestFingerprint: requestFingerprint(actor),
    admission,
  });
  await tx.appendAudit({
    id: deps.newId(),
    accountId: observation.account.accountId,
    consumerId: actor.consumerId,
    action: "resolve-self",
    accountRevision: observation.account.revision,
    observedAtMs: observation.observedAtMs,
  });
  return admission;
}

export async function resolveSelf(
  deps: AccountDependencies,
  input: {
    readonly actor: VerifiedHuman;
    readonly idempotencyKey: string;
  },
): Promise<SelfAdmission> {
  if (!/^[a-zA-Z0-9_-]{16,80}$/u.test(input.idempotencyKey)) {
    throw new AccountFailure("INVALID_ARGUMENT");
  }
  return deps.store.resolveTransaction(input.actor, async (tx) => {
    const context = { tx, deps, actor: input.actor, key: input.idempotencyKey };
    const account = await resolveAccount(context);
    requireActive(account);
    const existing = await tx.findAttachment(account.accountId, input.actor.consumerId);
    if (existing?.state === "detached") {
      throw new AccountFailure("REATTACHMENT_REQUIRED");
    }
    const observedAtMs = await tx.observeTimeMs();
    const attachment = existing ?? freshAttachment(account, input.actor, observedAtMs);
    const observation = {
      account,
      attachment,
      observedAtMs,
      credentialExpiresAtMs: input.actor.credentialExpiresAtMs,
      policy: deps.policy,
    };
    validateAdmission(input.actor, observation);
    const previous = await previousAdmission(context, observation);
    if (previous) {
      return previous;
    }
    if (!existing) {
      await attachConsumer(context, observation);
    }
    return commitAdmission(context, observation);
  });
}
