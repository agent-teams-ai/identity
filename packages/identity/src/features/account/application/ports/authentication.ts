import type { VerifiedActor } from "../../domain/authority.js";
export type {
  VerifiedActor,
  VerifiedHuman,
  VerifiedWorkload,
  VerifiedTerminalWorkload,
} from "../../domain/authority.js";

export class AuthenticationFailure extends Error {
  constructor(readonly reason: "UNAUTHENTICATED" | "UNAVAILABLE") {
    super(reason);
    this.name = "AuthenticationFailure";
  }
}

export interface AuthenticationPort {
  readonly authenticate: (bearer: string, signal: AbortSignal) => Promise<VerifiedActor>;
}
