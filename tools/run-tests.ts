import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { filesBelow } from "./build-evidence.ts";
import { prepareTestRuntime } from "./test-runtime.ts";

await prepareTestRuntime();
const entries = (await filesBelow(".test-build")).filter((path) => path.endsWith(".test.js"));
assert.ok(entries.length > 0, "No compiled test entry files were found.");
const child = spawn(
  "agent-teams-node-test",
  ["--contract", "architecture/testing/node-test-execution.json", "--", ...entries],
  { stdio: "inherit" },
);
process.exitCode = await new Promise<number>((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", (code, signal) => {
    if (signal !== null) {
      reject(new Error("Mandatory test runner ended by " + signal));
    } else {
      resolve(code ?? 1);
    }
  });
});
