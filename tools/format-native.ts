import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { filesBelow } from "./build-evidence.ts";

const execute = promisify(execFile);

async function readonlyCommand(
  executable: string,
  args: readonly string[],
  cwd: string,
): Promise<string> {
  const result = await execute(executable, args, {
    cwd,
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
    encoding: "utf8",
    env: { ...process.env, GOTOOLCHAIN: "local", GOWORK: "off", GOPROXY: "off", GOSUMDB: "off" },
  });
  return result.stdout;
}

export async function checkNativeFormats(): Promise<void> {
  const contracts = "packages/contracts";
  const buf = resolve("node_modules/.bin/buf");
  assert.equal((await readonlyCommand(buf, ["--version"], contracts)).trim(), "1.75.0");
  await readonlyCommand(buf, ["format", "--diff", "--exit-code"], contracts);
  const goRoot = contracts + "/gen/go";
  const goFiles = (await filesBelow(goRoot))
    .filter((path) => path.endsWith(".go"))
    .map((path) => resolve(path));
  assert.ok(goFiles.length > 0);
  assert.equal(
    (await readonlyCommand("gofmt", ["-l", ...goFiles], goRoot)).trim(),
    "",
    "Go formatting differs.",
  );
  const module = await readFile(goRoot + "/go.mod", "utf8");
  assert.equal(await readonlyCommand("go", ["mod", "edit", "-fmt", "-print"], goRoot), module);
  const sums = (await readFile(goRoot + "/go.sum", "utf8")).trimEnd().split("\n");
  assert.ok(sums.length > 0);
  assert.equal(new Set(sums).size, sums.length);
  for (const line of sums) {
    assert.match(line, /^\S+ v\S+ h1:[A-Za-z0-9+/]{43}=$/u);
  }
}
