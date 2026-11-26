import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const modules = ["packages/contracts", "packages/identity", "apps/server"];
export const evidencePath = ".test-build/build-evidence.json";
export const buildInputsPath = ".test-build/build-inputs.json";

export async function filesBelow(root: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(root)) {
    if (entry === "node_modules") {
      continue;
    }
    const path = join(root, entry);
    const state = await lstat(path);
    assert.ok(!state.isSymbolicLink(), "Unexpected source/artifact symlink: " + path);
    if (state.isDirectory()) {
      found.push(...(await filesBelow(path)));
    } else {
      assert.ok(state.isFile(), "Expected a regular artifact: " + path);
      found.push(path.replaceAll("\\", "/"));
    }
  }
  return found.toSorted();
}

async function digestFiles(paths: readonly string[]) {
  return Promise.all(
    [...new Set(paths)].toSorted().map(async (path) => ({
      path,
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    })),
  );
}

export async function captureBuildInputs() {
  const inputs = [
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "toolchain.config.json",
    "tsconfig.base.json",
    "tsconfig.build.json",
    "tsconfig.tests.json",
    "tsconfig.json",
    "tsconfig.quality.json",
    "tools/build-evidence.ts",
    "tools/clean-build.ts",
    "tools/record-build-evidence.ts",
  ];
  for (const module of modules) {
    inputs.push(module + "/package.json", module + "/tsconfig.json");
    inputs.push(...(await filesBelow(module + "/src")), ...(await filesBelow(module + "/tests")));
  }
  return digestFiles(inputs);
}

export async function captureBuildEvidence() {
  const inputs = await captureBuildInputs();
  const outputs: string[] = [];
  for (const module of modules) {
    outputs.push(
      ...(await filesBelow(module + "/dist")),
      ...(await filesBelow(module + "/.cache")),
    );
  }
  outputs.push(...(await filesBelow(".test-build")).filter((path) => path !== evidencePath));
  return {
    schemaVersion: 1,
    producer: "stack-toolchain@0.3.1/compile",
    inputs,
    outputs: await digestFiles(outputs),
  };
}

export async function checkBuildEvidence(): Promise<void> {
  const recorded: unknown = JSON.parse(await readFile(evidencePath, "utf8"));
  assert.deepEqual(
    recorded,
    await captureBuildEvidence(),
    "Native build inputs or complete outputs changed.",
  );
}
