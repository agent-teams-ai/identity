import assert from "node:assert/strict";
import { lstat, mkdir, realpath, symlink } from "node:fs/promises";
import { resolve } from "node:path";

function missing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export async function prepareTestRuntime(): Promise<void> {
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
      if (!missing(error)) {
        throw error;
      }
      await symlink(target, link, "junction");
    }
  }
}
