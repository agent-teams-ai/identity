import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { accountMutations, domainNames, domainTest, mutationInputs } from "./account-mutations.ts";
import { checkBuildEvidence } from "./build-evidence.ts";

async function copyCompiledInputs(root: string): Promise<void> {
  await writeFile(join(root, "package.json"), '{"type":"module"}\n', { flag: "wx" });
  for (const path of mutationInputs) {
    const source = join(".test-build", path);
    const state = await lstat(source);
    assert.ok(state.isFile() && !state.isSymbolicLink(), "Expected a real compiled input.");
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, await readFile(source), { flag: "wx" });
  }
}

function executeDomainTests(root: string, expectedFailure?: string): void {
  const result = spawnSync(
    process.execPath,
    ["--test", "--test-reporter=tap", resolve(root, domainTest)],
    { cwd: process.cwd(), encoding: "utf8", timeout: 10_000, maxBuffer: 1_048_576 },
  );
  assert.equal(result.error, undefined, "A process error is not mutation evidence.");
  assert.equal(result.signal, null, "An interrupted test process is not mutation evidence.");
  assert.equal(result.stderr, "", "Unexpected native test stderr.");
  assert.equal(result.status, expectedFailure === undefined ? 0 : 1, result.stdout);
  const outcomes = [...result.stdout.matchAll(/^(not ok|ok) [0-9]+ - (.+)$/gmu)].map((match) => ({
    outcome: match[1],
    name: match[2],
  }));
  assert.deepEqual(
    outcomes.map(({ name }) => name),
    domainNames,
    result.stdout,
  );
  for (const outcome of outcomes) {
    assert.equal(
      outcome.outcome,
      outcome.name === expectedFailure ? "not ok" : "ok",
      result.stdout,
    );
  }
  const lines = new Set(result.stdout.split("\n"));
  for (const line of ["# tests 3", "# cancelled 0", "# skipped 0", "# todo 0"]) {
    assert.ok(lines.has(line), "Incomplete native test execution: " + line);
  }
  if (expectedFailure !== undefined) {
    assert.match(
      result.stdout,
      /code: 'ERR_ASSERTION'/u,
      "A non-assertion failure is not a killed mutant.",
    );
  }
}

async function applyMutation(root: string, index: number): Promise<void> {
  const mutation = accountMutations[index];
  assert.ok(mutation !== undefined);
  const path = join(root, mutation.file);
  let content = await readFile(path, "utf8");
  for (const edit of mutation.edits) {
    assert.equal(
      content.split(edit.before).length,
      2,
      "Reviewed mutation shape changed: " + mutation.id,
    );
    content = content.replace(edit.before, edit.after);
  }
  await writeFile(path, content);
  executeDomainTests(root, mutation.expectedFailure);
  console.log("Killed reviewed account mutant: " + mutation.id);
}

await checkBuildEvidence();
const originals = await Promise.all(
  mutationInputs.map((path) => readFile(join(".test-build", path))),
);
const corpusBefore = await readFile("architecture/specifications/admission.json");
const temporary = await mkdtemp(join(tmpdir(), "identity-account-mutations-"));
try {
  const original = join(temporary, "original");
  await mkdir(original);
  await copyCompiledInputs(original);
  executeDomainTests(original);
  for (let index = 0; index < accountMutations.length; index += 1) {
    const candidate = join(temporary, "candidate-" + index);
    await mkdir(candidate);
    await copyCompiledInputs(candidate);
    await applyMutation(candidate, index);
  }
  assert.deepEqual(
    await Promise.all(mutationInputs.map((path) => readFile(join(".test-build", path)))),
    originals,
    "A mutation changed actual compiler outputs.",
  );
  assert.deepEqual(await readFile("architecture/specifications/admission.json"), corpusBefore);
  await checkBuildEvidence();
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  "The original domain passed; all six reviewed mutants failed their required assertion family.",
);
