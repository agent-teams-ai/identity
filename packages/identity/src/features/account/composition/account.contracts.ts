import { defineContract } from "@get-modular/assembly";
import type { CapabilitiesOf } from "@get-modular/assembly";
import type { AccountApi, AccountAuthentication } from "../contracts/account.js";

export const AccountApiContract = defineContract<AccountApi>()({
  id: "identity/account-api",
  revision: 1,
});
export const AccountAuthenticationContract = defineContract<AccountAuthentication>()({
  id: "identity/account-authentication",
  revision: 1,
});
export type AccountContracts = typeof AccountApiContract | typeof AccountAuthenticationContract;
export interface AccountCapabilities extends CapabilitiesOf<AccountContracts> {}
