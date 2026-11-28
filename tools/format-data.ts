import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseDocument } from "yaml";
import {
  assertScaffoldPlanDigest,
  assertScaffoldReceiptDigest,
  readScaffoldPlanFile,
  validateScaffoldReceipt,
} from "@agent-teams/engineering-foundation/scaffolding";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function record(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value));
  return value;
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function checkPinnedNativeInputs(): Promise<void> {
  const value: unknown = JSON.parse(
    await readFile("architecture/format/native-inputs.json", "utf8"),
  );
  const manifest = record(value);
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.inputs) && manifest.inputs.length > 0);
  const paths = new Set<string>();
  for (const item of manifest.inputs) {
    const input = record(item);
    assert.ok(
      typeof input.path === "string" && !input.path.startsWith("/") && !input.path.includes(".."),
    );
    assert.ok(typeof input.sha256 === "string" && /^[a-f0-9]{64}$/u.test(input.sha256));
    assert.ok(!paths.has(input.path), "Duplicate native input.");
    paths.add(input.path);
    assert.equal(
      digest(await readFile(input.path)),
      input.sha256,
      "Reviewed native bytes changed: " + input.path,
    );
  }
  const profileValue: unknown = parseDocument(
    await readFile("architecture/foundation/quality-format-coverage.yaml", "utf8"),
    { uniqueKeys: true },
  ).toJS({ maxAliasCount: 0 });
  const profile = record(profileValue);
  assert.ok(Array.isArray(profile.routes));
  const declared = profile.routes.flatMap((routeValue: unknown) => {
    const route = record(routeValue);
    assert.equal(route.authority, "consumer-native-inputs");
    assert.ok(
      Array.isArray(route.files) && route.files.every((path: unknown) => typeof path === "string"),
    );
    return route.files;
  });
  assert.deepEqual(
    [...paths].toSorted(),
    declared.toSorted(),
    "Every exact authority input needs its reviewed bytes.",
  );
}

export async function checkNativeLock(): Promise<void> {
  const bytes = await readFile("pnpm-lock.yaml");
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const document = parseDocument(text, { uniqueKeys: true });
  assert.deepEqual(document.errors, []);
  const value: unknown = document.toJS({ maxAliasCount: 0 });
  const lock = record(value);
  assert.equal(lock.lockfileVersion, "9.0");
  assert.deepEqual(Object.keys(record(lock.importers)).toSorted(), [
    ".",
    "apps/server",
    "packages/contracts",
    "packages/identity",
  ]);
  assert.ok(Object.keys(record(lock.packages)).length > 0);
}

export async function checkRetainedScaffolds(): Promise<void> {
  for (const name of ["identity-core", "identity-contracts"]) {
    const prefix = "architecture/scaffolding/" + name;
    const plan = await readScaffoldPlanFile(process.cwd(), prefix + ".plan.json");
    assertScaffoldPlanDigest(plan);
    const value: unknown = JSON.parse(await readFile(prefix + ".receipt.json", "utf8"));
    const receipt = await validateScaffoldReceipt(value, plan);
    assertScaffoldReceiptDigest(receipt, plan);
    assert.equal(receipt.outcome, "applied");
  }
}
