export { createIdentity } from "./composition/identity.root.js";
export { isAccountFailure } from "./features/account/contracts/account.js";
export type {
  AccountApi,
  AccountAuthentication,
  AccountReference,
  AccountStatus,
  Admission,
  FailureReason,
  HumanAuthority,
  WorkloadAuthority,
  TerminalWorkloadAuthority,
} from "./features/account/contracts/account.js";
export type {
  AccountClosureApi,
  ClosurePage,
  ClosurePageRequest,
  ClosureParticipantReference,
  ClosureReceipt,
} from "./features/account/contracts/closure.js";
