import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, lstat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export async function copyFormatConsumer(source: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true });
  for (const entry of (await readdir(source)).toSorted()) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }
    const from = join(source, entry);
    const to = join(target, entry);
    const state = await lstat(from);
    assert.ok(!state.isSymbolicLink(), "A qualification source cannot be an unobserved link.");
    if (state.isDirectory()) {
      await copyFormatConsumer(from, to);
    } else {
      assert.ok(state.isFile(), "A qualification source must be a regular file.");
      await writeFile(to, await readFile(from), { flag: "wx", mode: state.mode });
    }
  }
}

export async function snapshotFormatConsumer(
  root: string,
  prefix = "",
): Promise<readonly string[]> {
  const result: string[] = [];
  for (const entry of (await readdir(root)).toSorted()) {
    if (entry === ".git" || entry === "node_modules") {
      continue;
    }
    const path = join(root, entry);
    const relative = prefix + entry;
    const state = await lstat(path);
    assert.ok(!state.isSymbolicLink());
    if (state.isDirectory()) {
      result.push(...(await snapshotFormatConsumer(path, relative + "/")));
    } else {
      assert.ok(state.isFile());
      const digest = createHash("sha256")
        .update(await readFile(path))
        .digest("hex");
      result.push(relative + ":" + digest);
    }
  }
  return result;
}
