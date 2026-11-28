import type {
  AccountClosureApi,
  AccountClosureDependencies,
} from "../../application/ports/account-closure.js";
import { listClosureParticipants } from "../../application/use-cases/list-closure-participants.js";
import { reportClosureReceipt } from "../../application/use-cases/report-closure-receipt.js";

export function createAccountClosures(deps: AccountClosureDependencies): AccountClosureApi {
  if (
    !Number.isSafeInteger(deps.maximumClockSkewMs) ||
    deps.maximumClockSkewMs < 0 ||
    deps.maximumClockSkewMs > 60_000
  ) {
    throw new TypeError("Invalid closure credential clock bound");
  }
  return {
    listPendingClosures: (actor, page) => listClosureParticipants(deps, actor, "pending", page),
    listRepairRequiredClosures: (actor, page) =>
      listClosureParticipants(deps, actor, "repair-required", page),
    reportClosure: (actor, receipt) => reportClosureReceipt(deps, actor, receipt),
  };
}
