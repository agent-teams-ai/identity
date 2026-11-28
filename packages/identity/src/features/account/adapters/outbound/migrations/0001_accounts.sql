BEGIN;
CREATE TABLE identity_schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE identity_accounts (
  account_id uuid PRIMARY KEY,
  authority_incarnation text NOT NULL CHECK (length(authority_incarnation) BETWEEN 1 AND 128),
  eligibility text NOT NULL CHECK (eligibility IN ('active', 'suspended', 'closed')),
  revision bigint NOT NULL CHECK (revision > 0),
  security_epoch bigint NOT NULL CHECK (security_epoch > 0),
  authentication_cutoff_ms bigint NOT NULL CHECK (authentication_cutoff_ms >= 0),
  created_at_ms bigint NOT NULL,
  updated_at_ms bigint NOT NULL CHECK (updated_at_ms >= created_at_ms)
);
CREATE TABLE identity_authority_bindings (
  authority_id text NOT NULL, issuer text NOT NULL, subject text NOT NULL,
  authority_incarnation text NOT NULL,
  account_id uuid NOT NULL REFERENCES identity_accounts(account_id),
  revision bigint NOT NULL CHECK (revision > 0),
  state text NOT NULL CHECK (state IN ('active', 'retired')),
  PRIMARY KEY (authority_id, issuer, subject)
);
CREATE INDEX identity_bindings_account ON identity_authority_bindings(account_id);
CREATE TABLE identity_consumer_attachments (
  account_id uuid NOT NULL REFERENCES identity_accounts(account_id), consumer_id text NOT NULL,
  generation bigint NOT NULL CHECK (generation > 0), revision bigint NOT NULL CHECK (revision > 0),
  state text NOT NULL CHECK (state IN ('active', 'detached')),
  reattachment_cutoff_ms bigint NOT NULL CHECK (reattachment_cutoff_ms >= 0), created_at_ms bigint NOT NULL,
  PRIMARY KEY (account_id, consumer_id)
);
CREATE TABLE identity_resolution_receipts (
  authority_id text NOT NULL, issuer text NOT NULL, subject text NOT NULL, consumer_id text NOT NULL,
  receipt_key text NOT NULL CHECK (length(receipt_key) BETWEEN 16 AND 80), request_fingerprint text NOT NULL,
  account_id uuid NOT NULL REFERENCES identity_accounts(account_id), authority_incarnation text NOT NULL,
  account_revision bigint NOT NULL CHECK (account_revision > 0), security_epoch bigint NOT NULL CHECK (security_epoch > 0),
  authentication_cutoff_ms bigint NOT NULL,
  attachment_generation bigint NOT NULL CHECK (attachment_generation > 0), reattachment_cutoff_ms bigint NOT NULL,
  observed_at_ms bigint NOT NULL, status_valid_until_ms bigint NOT NULL CHECK (status_valid_until_ms > observed_at_ms),
  authority_session_id text NOT NULL,
  proof_profile text NOT NULL CHECK (proof_profile IN ('provider-session-control-v1', 'independent-continuity-v1')),
  proof_authenticated_at_ms bigint NOT NULL, proof_valid_until_ms bigint NOT NULL,
  proof_policy_version text NOT NULL, proof_scope text NOT NULL,
  PRIMARY KEY (authority_id, issuer, subject, consumer_id, receipt_key)
);
CREATE TABLE identity_security_audit (
  event_id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES identity_accounts(account_id), consumer_id text,
  action text NOT NULL, account_revision bigint NOT NULL CHECK (account_revision > 0), observed_at_ms bigint NOT NULL
);
CREATE TABLE identity_outbox (
  event_id uuid PRIMARY KEY, account_id uuid NOT NULL REFERENCES identity_accounts(account_id), consumer_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('account.attached', 'account.eligibility-changed')),
  account_revision bigint NOT NULL CHECK (account_revision > 0), security_epoch bigint NOT NULL CHECK (security_epoch > 0),
  attachment_generation bigint NOT NULL CHECK (attachment_generation > 0), observed_at_ms bigint NOT NULL,
  published_at_ms bigint, claim_generation bigint NOT NULL DEFAULT 0, claimed_until_ms bigint
);
CREATE INDEX identity_outbox_pending ON identity_outbox(observed_at_ms) WHERE published_at_ms IS NULL;
CREATE TABLE identity_closure_participants (
  account_id uuid NOT NULL REFERENCES identity_accounts(account_id), consumer_id text NOT NULL,
  closure_revision bigint NOT NULL CHECK (closure_revision > 0), participant_generation bigint NOT NULL CHECK (participant_generation > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'not-provisioned', 'erased', 'retained-by-policy', 'repair-required')),
  captured_at_ms bigint NOT NULL, PRIMARY KEY (account_id, consumer_id)
);
INSERT INTO identity_schema_migrations(version) VALUES (1);
COMMIT;
