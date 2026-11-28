import { defineContract } from "@get-modular/assembly";
import type { CapabilitiesOf } from "@get-modular/assembly";
import type { AccountApi, AccountAuthentication } from "../contracts/account.js";
import type { AccountClosureApi } from "../contracts/closure.js";

export const AccountApiContract = defineContract<AccountApi>()({
  id: "identity/account-api",
  revision: 1,
});
export const AccountAuthenticationContract = defineContract<AccountAuthentication>()({
  id: "identity/account-authentication",
  revision: 1,
});
export const AccountClosureContract = defineContract<AccountClosureApi>()({
  id: "identity/account-closure",
  revision: 1,
});
export type AccountContracts =
  | typeof AccountApiContract
  | typeof AccountAuthenticationContract
  | typeof AccountClosureContract;
export interface AccountCapabilities extends CapabilitiesOf<AccountContracts> {}
