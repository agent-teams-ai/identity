import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value));
}

function numbers(value: unknown): number[] {
  assert.ok(Array.isArray(value) && value.length > 0);
  return value.map((item: unknown) => {
    assert.ok(typeof item === "number" && Number.isSafeInteger(item));
    return item;
  });
}

export async function readAdmissionSpecification() {
  const parsed: unknown = JSON.parse(
    await readFile("architecture/specifications/admission.json", "utf8"),
  );
  const data = record(parsed);
  const policy = record(data.policy);
  assert.equal(data.schemaVersion, 1);
  assert.equal(policy.statusBudgetMs, 60_000);
  assert.equal(policy.maximumClockSkewMs, 5_000);
  assert.ok(Array.isArray(data.transitionEpochs));
  return {
    observedAtMs: numbers(data.observedAtMs),
    credentialLifetimesMs: numbers(data.credentialLifetimesMs),
    accountCutoffsMs: numbers(data.accountCutoffsMs),
    reattachmentCutoffsMs: numbers(data.reattachmentCutoffsMs),
    cutoffOffsetsMs: numbers(data.cutoffOffsetsMs),
    transitionCutoffsMs: numbers(data.transitionCutoffsMs),
    transitionEpochs: data.transitionEpochs.map((item: unknown) => {
      assert.ok(typeof item === "string" && /^(?:0|[1-9][0-9]{0,18})$/u.test(item));
      return BigInt(item);
    }),
  };
}
