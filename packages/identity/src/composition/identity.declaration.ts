import { declareModule } from "@get-modular/assembly";
import { required } from "@get-modular/core";
import {
  AccountApiContract,
  AccountAuthenticationContract,
  AccountClosureContract,
} from "../features/account/composition/account.contracts.js";

export const identityDeclaration = declareModule({
  moduleId: "identity/host",
  implementationId: "identity/host-static",
  owner: { authority: "agent-teams-identity", path: ["host"] },
  provides: [],
  slots: [
    AccountApiContract.slot("accounts", required()),
    AccountAuthenticationContract.slot("authentication", required()),
    AccountClosureContract.slot("closures", required()),
  ],
});
