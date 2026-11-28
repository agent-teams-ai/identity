import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { filesBelow } from "./build-evidence.ts";
import {
  contractRoot as contracts,
  generatedArtifactPaths as generated,
  generateContractFiles,
  runContractCommand as run,
  verifyContractTools,
} from "./contract-generation.ts";

const inputBytes = async (): Promise<readonly { path: string; content: string }[]> => {
  const paths = [
    join(contracts, "buf.yaml"),
    join(contracts, "buf.gen.yaml"),
    ...(await filesBelow(join(contracts, "proto"))),
    ...(await filesBelow(join(contracts, "src/features/protocol/contracts/gen"))),
    ...(await filesBelow(join(contracts, "gen/go"))),
  ].toSorted();
  return Promise.all(
    paths.map(async (path) => ({ path, content: (await readFile(path)).toString("base64") })),
  );
};

const requireNativeTests = (output: string): void => {
  const required = new Set([
    "TestStatusWireVector",
    "TestUnknownAndAbsentValuesDoNotBecomeActiveEvidence",
    "TestClosureReceiptWireVector",
    "TestClosureReceiptUnknownAndAbsentValuesRemainExplicit",
  ]);
  for (const line of output.split("\n")) {
    const event: unknown = JSON.parse(line);
    assert.ok(typeof event === "object" && event !== null, "Invalid native Go test event");
    if (
      "Action" in event &&
      event.Action === "pass" &&
      "Test" in event &&
      typeof event.Test === "string"
    ) {
      required.delete(event.Test);
    }
  }
  assert.equal(required.size, 0, "Mandatory Go protocol vectors did not execute successfully");
};

const checkGenerated = async (temporary: string): Promise<void> => {
  await cp(join(contracts, "proto"), join(temporary, "proto"), {
    recursive: true,
    errorOnExist: true,
  });
  for (const name of ["buf.yaml", "buf.gen.yaml"]) {
    await cp(join(contracts, name), join(temporary, name), { errorOnExist: true });
  }
  await generateContractFiles(temporary);
  const actual = [
    ...(await filesBelow(join(temporary, "src/features/protocol/contracts/gen"))),
    ...(await filesBelow(join(temporary, "gen/go"))),
  ]
    .map((path) => relative(temporary, path).replaceAll("\\", "/"))
    .toSorted();
  assert.deepEqual(actual, generated, "Native generator artifact inventory differs");
  for (const path of generated) {
    assert.deepEqual(
      await readFile(join(temporary, path)),
      await readFile(join(contracts, path)),
      `Generated protocol artifact drift: ${path}`,
    );
  }
};

const before = await inputBytes();
const temporary = await mkdtemp(join(tmpdir(), "identity-contract-check-"));
try {
  await verifyContractTools();
  await run("buf", ["lint"]);
  await run("buf", ["build", "--output", join(temporary, "descriptor.bin")]);
  await checkGenerated(temporary);
  requireNativeTests(
    await run(
      "go",
      ["test", "-count=1", "-json", "-mod=readonly", "./..."],
      join(contracts, "gen/go"),
    ),
  );
  assert.deepEqual(
    await inputBytes(),
    before,
    "Contract sources changed during the read-only check",
  );
  process.stdout.write(
    "Identity contracts: native schema, deterministic bindings and required Go vectors passed.\n",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
