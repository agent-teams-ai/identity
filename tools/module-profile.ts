import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { STANDARD } from "@agent-teams/feature-module-standard";
import type { LayerRole, SurfaceMap } from "@agent-teams/feature-module-standard/node";

function record(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value));
}
function text(value: unknown): string {
  assert.equal(typeof value, "string");
  assert.ok(typeof value === "string");
  return value;
}
function array(value: unknown): readonly unknown[] {
  assert.ok(Array.isArray(value));
  return value;
}
function texts(value: unknown): string[] {
  return array(value).map(text);
}
function layer(role: unknown): LayerRole {
  switch (role) {
    case "domain":
    case "application":
    case "contracts":
    case "adapters":
    case "composition":
    case "testing":
      return role;
    default:
      throw new Error("Unknown FMS layer role.");
  }
}
function surfaces(value: unknown): SurfaceMap {
  const data = record(value);
  const result: SurfaceMap = {
    public: data.public === undefined ? [] : texts(data.public),
    internalApi: data.internalApi === undefined ? [] : texts(data.internalApi),
    compositionContract:
      data.compositionContract === undefined ? [] : texts(data.compositionContract),
    compositionSurface: data.compositionSurface === undefined ? [] : texts(data.compositionSurface),
    testing: data.testing === undefined ? [] : texts(data.testing),
  };
  assert.ok(Object.keys(data).every((key) => Object.hasOwn(result, key)));
  return result;
}
function module(value: unknown) {
  const data = record(value);
  const features = array(data.features).map((item) => {
    const feature = record(item);
    return {
      root: text(feature.root),
      layers: array(feature.layers).map((layerValue) => {
        const mapped = record(layerValue);
        return { root: text(mapped.root), role: layer(mapped.role) };
      }),
    };
  });
  return {
    id: text(data.id),
    sourceRoot: text(data.sourceRoot),
    testRoots: texts(data.testRoots),
    testFeaturesRoot: text(data.testFeaturesRoot),
    features,
    surfaces: surfaces(data.surfaces),
    moduleAssembly: texts(data.moduleAssembly),
  };
}

export async function readModuleProfile() {
  const value: unknown = JSON.parse(
    await readFile("architecture/foundation/feature-modules.json", "utf8"),
  );
  const profile = record(value);
  const standard = record(profile.standard);
  assert.equal(standard.id, STANDARD.id);
  assert.equal(standard.version, STANDARD.version);
  assert.equal(standard.digest, STANDARD.digest);
  return array(profile.modules).map(module);
}
