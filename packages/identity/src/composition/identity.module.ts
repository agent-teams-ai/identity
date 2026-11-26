import { implement } from "@get-modular/assembly";
import type { IdentityCapabilities } from "./identity.contracts.js";
import { identityDeclaration } from "./identity.declaration.js";

export const identityEntry = implement<IdentityCapabilities>()(
  identityDeclaration,
  async (dependencies) => ({
    instance: { accounts: dependencies.accounts, authentication: dependencies.authentication },
    capabilities: {},
  }),
);
