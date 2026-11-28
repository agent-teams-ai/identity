import { implement } from "@get-modular/assembly";
import type { ServerCapabilities } from "./server.contracts.js";
import { serverDeclaration } from "./server.declaration.js";

export const serverEntry = implement<ServerCapabilities>()(
  serverDeclaration,
  async (dependencies) => ({
    instance: dependencies.http,
    capabilities: {},
  }),
);
