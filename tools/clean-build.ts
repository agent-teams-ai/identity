import { mkdir, rm, writeFile } from "node:fs/promises";
import { buildInputsPath, captureBuildInputs } from "./build-evidence.ts";

for (const path of [
  ".test-build",
  "packages/contracts/dist",
  "packages/contracts/.cache",
  "packages/identity/dist",
  "packages/identity/.cache",
  "apps/server/dist",
  "apps/server/.cache",
]) {
  await rm(path, { recursive: true, force: true });
}
await mkdir(".test-build");
await writeFile(buildInputsPath, JSON.stringify(await captureBuildInputs(), null, 2) + "\n", {
  flag: "wx",
});
