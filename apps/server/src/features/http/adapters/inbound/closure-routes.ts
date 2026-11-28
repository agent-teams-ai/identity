import { Code, ConnectError, type ConnectRouter, type HandlerContext } from "@connectrpc/connect";
import {
  IdentityClosureService,
  ClosureReceiptOutcome,
  type ClosureParticipantReference as WireParticipant,
} from "@agent-teams/identity-contracts";
import type {
  AccountAuthentication,
  AccountClosureApi,
  ClosureParticipantReference,
  ClosurePage,
  ClosureReceipt,
} from "@agent-teams/identity-core";
import { actorOf, guarded } from "./rpc-context.js";

interface ClosureHttpDependencies {
  readonly closures: AccountClosureApi;
  readonly authentication: AccountAuthentication;
}

async function terminalActor(deps: ClosureHttpDependencies, context: HandlerContext) {
  const actor = await actorOf(deps.authentication, context);
  if (actor.kind !== "terminal-workload") {
    throw new ConnectError("Terminal workload authority is required", Code.PermissionDenied);
  }
  return actor;
}

function participant(value: WireParticipant | undefined): ClosureParticipantReference {
  if (value?.account === undefined || value.manifestVersion !== 1) {
    throw new ConnectError("An exact versioned participant is required", Code.InvalidArgument);
  }
  return {
    accountId: value.account.accountId,
    authorityIncarnation: value.account.authorityIncarnation,
    closureRevision: value.closureRevision,
    participantGeneration: value.participantGeneration,
    manifestVersion: 1,
  };
}

function outcome(value: ClosureReceiptOutcome): ClosureReceipt["outcome"] {
  switch (value) {
    case ClosureReceiptOutcome.NOT_PROVISIONED:
      return "not-provisioned";
    case ClosureReceiptOutcome.ERASED:
      return "erased";
    case ClosureReceiptOutcome.REPAIR_REQUIRED:
      return "repair-required";
    default:
      throw new ConnectError("Unsupported closure outcome", Code.InvalidArgument);
  }
}

function pageMessage(page: ClosurePage) {
  return {
    participants: page.participants.map((item) => ({
      account: { accountId: item.accountId, authorityIncarnation: item.authorityIncarnation },
      closureRevision: item.closureRevision,
      participantGeneration: item.participantGeneration,
      manifestVersion: item.manifestVersion,
    })),
    nextAfterAccountId: page.nextAfterAccountId,
  };
}

export function registerClosureRoutes(router: ConnectRouter, deps: ClosureHttpDependencies): void {
  router.service(IdentityClosureService, {
    listPendingClosures: async (request, context) =>
      guarded(async () => {
        const actor = await terminalActor(deps, context);
        return pageMessage(
          await deps.closures.listPendingClosures(actor, {
            limit: request.limit,
            afterAccountId: request.afterAccountId,
          }),
        );
      }),
    listRepairRequiredClosures: async (request, context) =>
      guarded(async () => {
        const actor = await terminalActor(deps, context);
        return pageMessage(
          await deps.closures.listRepairRequiredClosures(actor, {
            limit: request.limit,
            afterAccountId: request.afterAccountId,
          }),
        );
      }),
    reportClosure: async (request, context) =>
      guarded(async () => {
        const actor = await terminalActor(deps, context);
        await deps.closures.reportClosure(actor, {
          participant: participant(request.participant),
          outcome: outcome(request.outcome),
        });
        return { accepted: true };
      }),
  });
}
