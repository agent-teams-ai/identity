import type { CapabilitiesOf } from "@get-modular/assembly";
import type { AccountContracts } from "../features/account/composition/account.contracts.js";
export type IdentityContracts = AccountContracts;
export interface IdentityCapabilities extends CapabilitiesOf<AccountContracts> {}
