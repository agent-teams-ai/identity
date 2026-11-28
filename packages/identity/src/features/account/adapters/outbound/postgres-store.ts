import type { Pool, PoolClient } from "pg";
import type {
  AccountStore,
  AccountTransaction,
  ResolutionReceipt,
} from "../../application/ports/account-store.js";
import type {
  Account,
  AuthorityBinding,
  AuthoritySubject,
  ConsumerAttachment,
} from "../../domain/model.js";
import { accountOf, admissionOf, attachmentOf, milliseconds } from "./postgres-codecs.js";
import type { StoredAccount, StoredAttachment, StoredReceipt } from "./postgres-codecs.js";

type StoredBinding = {
  account_id: string;
  authority_id: string;
  issuer: string;
  subject: string;
  authority_incarnation: string;
  revision: string;
  state: AuthorityBinding["state"];
};

async function findBinding(
  tx: PoolClient,
  authority: AuthoritySubject,
): Promise<AuthorityBinding | undefined> {
  const result = await tx.query<StoredBinding>(
    "SELECT * FROM identity_authority_bindings WHERE authority_id = $1 AND issuer = $2 AND subject = $3",
    [authority.authorityId, authority.issuer, authority.subject],
  );
  const row = result.rows[0];
  return row
    ? {
        accountId: row.account_id,
        authorityId: row.authority_id,
        issuer: row.issuer,
        subject: row.subject,
        authorityIncarnation: row.authority_incarnation,
        revision: BigInt(row.revision),
        state: row.state,
      }
    : undefined;
}
async function lockAccount(tx: PoolClient, accountId: string): Promise<Account | undefined> {
  const result = await tx.query<StoredAccount>(
    "SELECT * FROM identity_accounts WHERE account_id = $1 FOR UPDATE",
    [accountId],
  );
  return result.rows[0] ? accountOf(result.rows[0]) : undefined;
}
async function createAccount(
  tx: PoolClient,
  account: Account,
  binding: AuthorityBinding,
): Promise<void> {
  await tx.query(
    `INSERT INTO identity_accounts
    (account_id, authority_incarnation, eligibility, revision, security_epoch, authentication_cutoff_ms, created_at_ms, updated_at_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      account.accountId,
      account.authorityIncarnation,
      account.eligibility,
      account.revision,
      account.securityEpoch,
      account.authenticationCutoffMs,
      account.createdAtMs,
      account.updatedAtMs,
    ],
  );
  await tx.query(
    `INSERT INTO identity_authority_bindings
    (authority_id, issuer, subject, authority_incarnation, account_id, revision, state)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      binding.authorityId,
      binding.issuer,
      binding.subject,
      binding.authorityIncarnation,
      binding.accountId,
      binding.revision,
      binding.state,
    ],
  );
}
async function saveAccount(tx: PoolClient, account: Account): Promise<void> {
  await tx.query(
    `UPDATE identity_accounts SET eligibility = $1, revision = $2,
    security_epoch = $3, authentication_cutoff_ms = $4, updated_at_ms = $5 WHERE account_id = $6`,
    [
      account.eligibility,
      account.revision,
      account.securityEpoch,
      account.authenticationCutoffMs,
      account.updatedAtMs,
      account.accountId,
    ],
  );
}
async function findAttachment(
  tx: PoolClient,
  accountId: string,
  consumerId: string,
): Promise<ConsumerAttachment | undefined> {
  const result = await tx.query<StoredAttachment>(
    "SELECT * FROM identity_consumer_attachments WHERE account_id = $1 AND consumer_id = $2",
    [accountId, consumerId],
  );
  return result.rows[0] ? attachmentOf(result.rows[0]) : undefined;
}
async function createAttachment(tx: PoolClient, attachment: ConsumerAttachment): Promise<void> {
  await tx.query(
    `INSERT INTO identity_consumer_attachments
    (account_id, consumer_id, generation, revision, state, reattachment_cutoff_ms, created_at_ms)
    VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      attachment.accountId,
      attachment.consumerId,
      attachment.generation,
      attachment.revision,
      attachment.state,
      attachment.reattachmentCutoffMs,
      attachment.createdAtMs,
    ],
  );
}
async function listAttachments(
  tx: PoolClient,
  accountId: string,
): Promise<readonly ConsumerAttachment[]> {
  const result = await tx.query<StoredAttachment>(
    "SELECT * FROM identity_consumer_attachments WHERE account_id = $1 ORDER BY consumer_id",
    [accountId],
  );
  return result.rows.map(attachmentOf);
}
async function findReceipt(
  tx: PoolClient,
  input: {
    readonly authority: AuthoritySubject;
    readonly consumerId: string;
    readonly key: string;
  },
): Promise<ResolutionReceipt | undefined> {
  const { authority, consumerId, key } = input;
  const result = await tx.query<StoredReceipt>(
    `SELECT * FROM identity_resolution_receipts
    WHERE authority_id = $1 AND issuer = $2 AND subject = $3 AND consumer_id = $4 AND receipt_key = $5`,
    [authority.authorityId, authority.issuer, authority.subject, consumerId, key],
  );
  const row = result.rows[0];
  return row
    ? {
        key: row.receipt_key,
        consumerId: row.consumer_id,
        authority: {
          authorityId: row.authority_id,
          issuer: row.issuer,
          subject: row.subject,
          authorityIncarnation: row.authority_incarnation,
        },
        requestFingerprint: row.request_fingerprint,
        admission: admissionOf(row),
      }
    : undefined;
}
async function saveReceipt(tx: PoolClient, receipt: ResolutionReceipt): Promise<void> {
  const { status, admission } = receipt.admission;
  await tx.query(
    `INSERT INTO identity_resolution_receipts
    (authority_id, issuer, subject, consumer_id, receipt_key, request_fingerprint,
      account_id, authority_incarnation, account_revision, security_epoch, authentication_cutoff_ms,
      attachment_generation, reattachment_cutoff_ms, observed_at_ms, status_valid_until_ms,
      authority_session_id, proof_profile, proof_authenticated_at_ms, proof_valid_until_ms, proof_policy_version, proof_scope)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      receipt.authority.authorityId,
      receipt.authority.issuer,
      receipt.authority.subject,
      receipt.consumerId,
      receipt.key,
      receipt.requestFingerprint,
      status.account.accountId,
      status.account.authorityIncarnation,
      status.accountRevision,
      status.securityEpoch,
      status.authenticationCutoffMs,
      status.attachmentGeneration,
      status.reattachmentCutoffMs,
      status.observedAtMs,
      status.validUntilMs,
      admission.authoritySessionId,
      admission.profile,
      admission.authenticatedAtMs,
      admission.validUntilMs,
      admission.policyVersion,
      admission.scope,
    ],
  );
}

function transactionPort(tx: PoolClient): AccountTransaction {
  return {
    observeTimeMs: async () => {
      const result = await tx.query<{ now_ms: string }>(
        "SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint AS now_ms",
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error("Database clock observation is missing");
      }
      return milliseconds(row.now_ms);
    },
    findBinding: (authority) => findBinding(tx, authority),
    lockAccount: (accountId) => lockAccount(tx, accountId),
    createAccount: (account, binding) => createAccount(tx, account, binding),
    saveAccount: (account) => saveAccount(tx, account),
    findAttachment: (accountId, consumerId) => findAttachment(tx, accountId, consumerId),
    createAttachment: (attachment) => createAttachment(tx, attachment),
    listAttachments: (accountId) => listAttachments(tx, accountId),
    findResolutionReceipt: (authority, consumerId, key) =>
      findReceipt(tx, { authority, consumerId, key }),
    saveResolutionReceipt: (receipt) => saveReceipt(tx, receipt),
    appendAudit: async (audit) => {
      await tx.query(
        `INSERT INTO identity_security_audit(event_id, account_id, consumer_id, action, account_revision, observed_at_ms)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          audit.id,
          audit.accountId,
          audit.consumerId,
          audit.action,
          audit.accountRevision,
          audit.observedAtMs,
        ],
      );
    },
    appendEvent: async (event) => {
      await tx.query(
        `INSERT INTO identity_outbox
        (event_id, account_id, consumer_id, kind, account_revision, security_epoch, attachment_generation, observed_at_ms)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          event.id,
          event.accountId,
          event.consumerId,
          event.kind,
          event.accountRevision,
          event.securityEpoch,
          event.attachmentGeneration,
          event.observedAtMs,
        ],
      );
    },
    captureClosureParticipants: async (accountId, revision, atMs) => {
      await tx.query(
        `INSERT INTO identity_closure_participants
        (account_id, consumer_id, closure_revision, participant_generation, captured_at_ms)
        SELECT account_id, consumer_id, $2, generation, $3 FROM identity_consumer_attachments WHERE account_id = $1`,
        [accountId, revision, atMs],
      );
    },
  };
}

async function runTransaction<T>(
  pool: Pool,
  run: (tx: AccountTransaction) => Promise<T>,
  authority?: AuthoritySubject,
): Promise<T> {
  const client = await pool.connect();
  let failedConnection: Error | undefined;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout = '3000ms'");
    await client.query("SET LOCAL lock_timeout = '2000ms'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '5000ms'");
    if (authority) {
      const key = JSON.stringify([authority.authorityId, authority.issuer, authority.subject]);
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
    }
    const result = await run(transactionPort(client));
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      failedConnection =
        rollbackError instanceof Error ? rollbackError : new Error("Rollback failed");
    }
    throw error;
  } finally {
    client.release(failedConnection);
  }
}

/** Borrows the Pool. Its Host owns readiness, drain and disposal. */
export function createPostgresAccountStore(pool: Pool): AccountStore {
  return {
    transaction: (run) => runTransaction(pool, run),
    resolveTransaction: (authority, run) => runTransaction(pool, run, authority),
  };
}
