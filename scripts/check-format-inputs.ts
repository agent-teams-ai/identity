import assert from "node:assert/strict";
import { checkBuildEvidence } from "../tools/build-evidence.ts";
import {
  checkNativeLock,
  checkPinnedNativeInputs,
  checkRetainedScaffolds,
} from "../tools/format-data.ts";
import { checkNativeFormats } from "../tools/format-native.ts";

assert.deepEqual(process.argv.slice(2), ["--check"]);
await checkPinnedNativeInputs();
await checkNativeLock();
await checkRetainedScaffolds();
await checkBuildEvidence();
await checkNativeFormats();
console.log(
  "Reviewed native inputs, retained scaffolding and actual compiler outputs are unchanged.",
);
