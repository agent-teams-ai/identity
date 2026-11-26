import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { lstat, mkdir, realpath, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { filesBelow } from "./build-evidence.ts";

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

for (const module of ["packages/contracts", "packages/identity", "apps/server"]) {
  const folder = ".test-build/" + module;
  const target = resolve(module, "node_modules");
  const link = folder + "/node_modules";
  await mkdir(folder, { recursive: true });
  try {
    const state = await lstat(link);
    assert.ok(state.isSymbolicLink());
    assert.equal(await realpath(link), await realpath(target));
  } catch (error) {
    if (!missing(error)) throw error;
    await symlink(target, link, "junction");
  }
}
const entries = (await filesBelow(".test-build")).filter((path) => path.endsWith(".test.js"));
assert.ok(entries.length > 0, "No compiled test entry files were found.");
const child = spawn("agent-teams-node-test", [
  "--contract", "architecture/testing/node-test-execution.json", "--", ...entries,
], { stdio: "inherit" });
process.exitCode = await new Promise<number>((resolveExit, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) reject(new Error("Mandatory test runner ended by " + signal));
    else resolveExit(code ?? 1);
  });
});
