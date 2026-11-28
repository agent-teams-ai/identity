import { implement } from "@get-modular/assembly";
import type { Pool } from "pg";
import { createAccounts } from "../adapters/inbound/direct-api.js";
import { createKeycloakAuthentication } from "../adapters/inbound/keycloak-authentication.js";
import type { KeycloakAuthenticationConfig } from "../adapters/inbound/keycloak-authentication.js";
import { createPostgresAccountStore } from "../adapters/outbound/postgres-store.js";
import type { AdmissionPolicy } from "../domain/admission-policy.js";
import { AccountApiContract, AccountAuthenticationContract } from "./account.contracts.js";
import type { AccountCapabilities } from "./account.contracts.js";
import { accountDeclaration } from "./account.declaration.js";

export interface AccountGroupOptions {
  readonly pool: Pool;
  readonly authentication: KeycloakAuthenticationConfig;
  readonly policy: AdmissionPolicy;
  readonly newId: () => string;
}
export function createAccountEntry(options: AccountGroupOptions) {
  return implement<AccountCapabilities>()(accountDeclaration, async () => {
    const store = createPostgresAccountStore(options.pool);
    const accounts = createAccounts({ store, newId: options.newId, policy: options.policy });
    const authentication = createKeycloakAuthentication(options.authentication);
    return {
      instance: { api: accounts.api, authentication },
      capabilities: {
        [AccountApiContract.id]: accounts.api,
        [AccountAuthenticationContract.id]: authentication,
      },
    };
  });
}
