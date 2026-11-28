import type { AccountReference } from "../../domain/model.js";
import type { VerifiedTerminalWorkload } from "../../domain/authority.js";
import type { ClosureManifestItem, ClosureReport } from "./account-outbox.js";

export interface ClosureParticipantReference extends AccountReference {
  readonly closureRevision: bigint;
  readonly participantGeneration: bigint;
  readonly manifestVersion: number;
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
    actor: VerifiedTerminalWorkload,
    page: ClosurePageRequest,
  ) => Promise<ClosurePage>;
  readonly listRepairRequiredClosures: (
    actor: VerifiedTerminalWorkload,
    page: ClosurePageRequest,
  ) => Promise<ClosurePage>;
  readonly reportClosure: (
    actor: VerifiedTerminalWorkload,
    receipt: ClosureReceipt,
  ) => Promise<void>;
}
export interface AccountClosureStore {
  readonly list: (
    consumerId: string,
    state: "pending" | "repair-required",
    page: ClosurePageRequest,
  ) => Promise<{
    readonly items: readonly ClosureManifestItem[];
    readonly observedAtMs: number;
  }>;
  /** Database time must precede this deadline after the receipt row is locked. */
  readonly report: (report: ClosureReport, validBeforeMs: number) => Promise<boolean>;
}
export interface AccountClosureDependencies {
  readonly store: AccountClosureStore;
  readonly maximumClockSkewMs: number;
}
