import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { copyFormatConsumer, snapshotFormatConsumer } from "./format-qualification-fixture.ts";

interface Witness {
  readonly id: string;
  readonly path: string;
  readonly after: string;
  readonly diagnostic: string;
}

const witnesses: readonly Witness[] = [
  {
    id: "native-runtime-bytes",
    path: ".node-version",
    after: "unreviewed-runtime\n",
    diagnostic: "Reviewed native bytes changed: .node-version",
  },
  {
    id: "native-lock-bytes",
    path: "pnpm-lock.yaml",
    after: "not: [valid yaml\n",
    diagnostic: "Reviewed native bytes changed: pnpm-lock.yaml",
  },
  {
    id: "retained-receipt-bytes",
    path: "architecture/scaffolding/identity-core.receipt.json",
    after: '{"outcome":"fabricated"}\n',
    diagnostic: "Reviewed native bytes changed:",
  },
  {
    id: "generated-contract-bytes",
    path: "packages/contracts/src/features/protocol/contracts/gen/identity/v1/identity_pb.ts",
    after: "export const forged = true;\n",
    diagnostic: "Reviewed native bytes changed:",
  },
  {
    id: "compiler-input-bytes",
    path: "packages/identity/src/features/account/domain/model.ts",
    after: "export const forged = true;\n",
    diagnostic: "Native build inputs or complete outputs changed.",
  },
  {
    id: "compiler-output-bytes",
    path: ".test-build/packages/identity/src/features/account/domain/model.js",
    after: "export const forged = true;\n",
    diagnostic: "Native build inputs or complete outputs changed.",
  },
  {
    id: "new-generated-family",
    path: ".test-build/unreviewed.xyz",
    after: "unknown\n",
    diagnostic: "Native build inputs or complete outputs changed.",
  },
];

function executeNode(root: string, arguments_: readonly string[]) {
  const result = spawnSync(process.execPath, arguments_, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 1_048_576,
  });
  assert.equal(result.error, undefined, "A process error is not a format witness.");
  assert.equal(result.signal, null, "An interrupted authority is not a format witness.");
  return result;
}

function rejectedBy(result: ReturnType<typeof executeNode>, diagnostic: string): boolean {
  return (
    result.status !== null &&
    result.status !== 0 &&
    (result.stdout + result.stderr).includes(diagnostic)
  );
}

async function prepare(root: string): Promise<void> {
  await copyFormatConsumer(process.cwd(), root);
  await symlink(resolve("node_modules"), join(root, "node_modules"), "junction");
}

async function exerciseWitness(root: string, witness: Witness): Promise<void> {
  await writeFile(join(root, witness.path), witness.after);
  const before = await snapshotFormatConsumer(root);
  const result = executeNode(root, ["scripts/check-format-inputs.ts", "--check"]);
  assert.ok(
    rejectedBy(result, witness.diagnostic),
    witness.id + ": wrong or absent rejection\n" + result.stdout + result.stderr,
  );
  assert.deepEqual(
    await snapshotFormatConsumer(root),
    before,
    witness.id + ": authority wrote input bytes",
  );
  console.log("Format authority rejected: " + witness.id);
}

async function exerciseBuildDrift(root: string): Promise<void> {
  await prepare(root);
  await writeFile(
    join(root, "packages/identity/src/features/account/domain/model.ts"),
    "// drift\n",
  );
  const before = await snapshotFormatConsumer(root);
  const result = executeNode(root, ["tools/record-build-evidence.ts"]);
  assert.ok(rejectedBy(result, "Build inputs changed during native compilation."));
  assert.deepEqual(await snapshotFormatConsumer(root), before, "Rejected build wrote evidence");
  console.log("Build evidence refused a changed precompile source snapshot.");
}

const temporary = await mkdtemp(join(tmpdir(), "identity-format-authority-"));
try {
  const baseline = join(temporary, "baseline");
  await prepare(baseline);
  const before = await snapshotFormatConsumer(baseline);
  const positive = executeNode(baseline, ["scripts/check-format-inputs.ts", "--check"]);
  assert.equal(positive.status, 0, positive.stdout + positive.stderr);
  assert.deepEqual(
    await snapshotFormatConsumer(baseline),
    before,
    "Positive authority wrote inputs",
  );
  for (const witness of witnesses) {
    const candidate = join(temporary, witness.id);
    await prepare(candidate);
    await exerciseWitness(candidate, witness);
  }
  await exerciseBuildDrift(join(temporary, "compile-drift"));
  const noop = join(temporary, "noop");
  await prepare(noop);
  await writeFile(join(noop, ".node-version"), "unreviewed-runtime\n");
  await writeFile(
    join(noop, "scripts/check-format-inputs.ts"),
    'process.stdout.write("noop\\n");\n',
  );
  assert.equal(
    rejectedBy(
      executeNode(noop, ["scripts/check-format-inputs.ts", "--check"]),
      "Reviewed native bytes changed:",
    ),
    false,
    "The independent witness oracle must reject a no-op validator as evidence.",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
console.log(
  "Read-only positive control, seven bad-input witnesses, build-drift and no-op controls passed.",
);
