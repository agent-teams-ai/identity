import { rm } from "node:fs/promises";

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
