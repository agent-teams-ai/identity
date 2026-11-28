import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { resolve as resolvePath } from "node:path";
import { prepareTestRuntime } from "./test-runtime.ts";

const phase = process.argv[2];
assert.ok(process.argv.length === 3 && (phase === "seed" || phase === "verify"));
await prepareTestRuntime();
const child = spawn(
  process.execPath,
  [
    resolvePath(".test-build/packages/identity/tests/features/account/postgres-recovery.native.js"),
    phase,
  ],
  { stdio: "inherit", timeout: 30_000 },
);
process.exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error("PostgreSQL recovery fixture ended by " + signal));
    } else {
      resolve(code ?? 1);
    }
  });
});
