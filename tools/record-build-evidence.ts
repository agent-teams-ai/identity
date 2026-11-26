import { writeFile } from "node:fs/promises";
import { captureBuildEvidence, evidencePath } from "./build-evidence.ts";

await writeFile(evidencePath, JSON.stringify(await captureBuildEvidence(), null, 2) + "\n");
