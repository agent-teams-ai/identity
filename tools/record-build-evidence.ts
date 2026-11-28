import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { buildInputsPath, captureBuildEvidence, evidencePath } from "./build-evidence.ts";

const before: unknown = JSON.parse(await readFile(buildInputsPath, "utf8"));
const evidence = await captureBuildEvidence();
assert.deepEqual(before, evidence.inputs, "Build inputs changed during native compilation.");
await writeFile(evidencePath, JSON.stringify(evidence, null, 2) + "\n", { flag: "wx" });
