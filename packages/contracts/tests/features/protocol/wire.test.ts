import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { fromBinary, fromJson, toBinary, toJson } from '@bufbuild/protobuf';
import { AccountEligibility, AccountStatusEvidenceSchema } from '../../../src/features/protocol/contracts/gen/identity/v1/identity_pb.js';

test('identity v1 wire preserves 64-bit revisions and timestamp precision', async () => {
  const fixture = JSON.parse(await readFile(resolve(process.cwd(), 'packages/contracts/gen/go/testdata/status-v1.json'), 'utf8'));
  const value = fromJson(AccountStatusEvidenceSchema, fixture);
  assert.equal(value.accountRevision, 9_007_199_254_740_997n);
  assert.equal(value.securityEpoch, 9_007_199_254_740_993n);
  assert.equal(value.attachmentGeneration, 9_007_199_254_740_995n);
  assert.equal(value.authenticationCutoff?.nanos, 123_456_789);
  const decoded = fromBinary(AccountStatusEvidenceSchema, toBinary(AccountStatusEvidenceSchema, value));
  assert.deepEqual(decoded, value);
  const rendered = toJson(AccountStatusEvidenceSchema, decoded);
  assert.ok(rendered !== null && typeof rendered === 'object' && !Array.isArray(rendered));
  assert.equal(rendered['securityEpoch'], '9007199254740993');
});

test('identity v1 unknown and absent evidence remains non-authoritative', () => {
  const unknown = fromJson(AccountStatusEvidenceSchema, { eligibility: 99 });
  assert.equal(unknown.eligibility, 99);
  assert.notEqual(unknown.eligibility, AccountEligibility.ACTIVE);
  const absent = fromJson(AccountStatusEvidenceSchema, {});
  assert.equal(absent.eligibility, AccountEligibility.UNSPECIFIED);
  assert.equal(absent.observedAt, undefined);
  assert.equal(absent.validUntil, undefined);
});
