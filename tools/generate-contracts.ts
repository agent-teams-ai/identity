import { contractRoot, generateContractFiles, verifyContractTools } from "./contract-generation.ts";

await verifyContractTools();
await generateContractFiles(contractRoot);
process.stdout.write("Generated pinned Identity bindings with the declared suppression removal.\n");
