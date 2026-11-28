import type { AccountReference, TerminalWorkloadAuthority } from "./account.js";

export interface ClosureParticipantReference extends AccountReference {
  readonly closureRevision: bigint;
  readonly participantGeneration: bigint;
  readonly manifestVersion: 1;
}
export interface ClosurePageRequest {
  readonly limit: number;
  readonly afterAccountId: string;
}
export interface ClosurePage {
  readonly participants: readonly ClosureParticipantReference[];
  readonly nextAfterAccountId: string;
}
export interface ClosureReceipt {
  readonly participant: ClosureParticipantReference;
  readonly outcome: "not-provisioned" | "erased" | "repair-required";
}
export interface AccountClosureApi {
  readonly listPendingClosures: (
    actor: TerminalWorkloadAuthority,
    page: ClosurePageRequest,
  ) => Promise<ClosurePage>;
  readonly listRepairRequiredClosures: (
    actor: TerminalWorkloadAuthority,
    page: ClosurePageRequest,
  ) => Promise<ClosurePage>;
  readonly reportClosure: (
    actor: TerminalWorkloadAuthority,
    receipt: ClosureReceipt,
  ) => Promise<void>;
}
