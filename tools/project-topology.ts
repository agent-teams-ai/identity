import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parse } from "yaml";
import { projectQualitySourceTopology } from "@agent-teams/feature-module-standard/quality-topology";

const profilePath = "architecture/foundation/feature-modules.json";
const qualityPath = "architecture/foundation/quality-source-coverage.yaml";
const outputPath = "architecture/foundation/quality-source-topology.json";
const profileBytes = await readFile(profilePath, "utf8");
const qualityBytes = await readFile(qualityPath, "utf8");
const profile: unknown = JSON.parse(profileBytes);
const quality: unknown = parse(qualityBytes);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

assert.ok(isRecord(quality));
assert.equal(typeof quality.sourcePolicyPath, "string");
assert.ok(typeof quality.sourcePolicyPath === "string");
assert.ok(Array.isArray(quality.assets));
const projected = projectQualitySourceTopology(profile, quality.sourcePolicyPath);
const assetRoots = quality.assets.map((asset: unknown) => {
  assert.ok(isRecord(asset) && typeof asset.path === "string");
  assert.match(asset.path, /\.(?:proto|sql)$/u);
  return dirname(asset.path);
});
const topology = {
  ...projected,
  sourceRoots: [...new Set([...projected.sourceRoots, ...assetRoots])].toSorted(),
  derivedFrom: [
    { path: profilePath, sha256: createHash("sha256").update(profileBytes).digest("hex") },
    { path: qualityPath, sha256: createHash("sha256").update(qualityBytes).digest("hex") },
  ],
};
if (process.argv[2] === "--write" && process.argv.length === 3) {
  await writeFile(outputPath, JSON.stringify(topology, null, 2) + "\n");
} else {
  assert.equal(process.argv.length, 2, "Only --write is an admitted mutation.");
  const observed: unknown = JSON.parse(await readFile(outputPath, "utf8"));
  assert.deepEqual(observed, topology, "Quality topology is stale; inspect and regenerate it.");
}
