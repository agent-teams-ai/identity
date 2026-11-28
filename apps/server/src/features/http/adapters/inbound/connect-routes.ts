import { Code, ConnectError, type ConnectRouter } from "@connectrpc/connect";
import { IdentityService } from "@agent-teams/identity-contracts";
import type {
  AccountApi,
  AccountAuthentication,
  AccountClosureApi,
} from "@agent-teams/identity-core";
import { admissionMessage, statusMessage } from "./wire-mapping.js";
import { actorOf, guarded } from "./rpc-context.js";
import { registerClosureRoutes } from "./closure-routes.js";

export interface IdentityHttpDependencies {
  readonly accounts: AccountApi;
  readonly closures: AccountClosureApi;
  readonly authentication: AccountAuthentication;
}

export function identityRoutes(
  dependencies: IdentityHttpDependencies,
): (router: ConnectRouter) => void {
  return (router) => {
    router.service(IdentityService, {
      resolveSelf: async (request, context) =>
        guarded(async () => {
          const actor = await actorOf(dependencies.authentication, context);
          if (actor.kind !== "human") {
            throw new ConnectError("Human authority is required", Code.PermissionDenied);
          }
          const result = await dependencies.accounts.resolveSelf(actor, request.idempotencyKey);
          return {
            status: statusMessage(result.status),
            admission: admissionMessage(result.admission),
          };
        }),
      getSelfStatus: async (_request, context) =>
        guarded(async () => {
          const actor = await actorOf(dependencies.authentication, context);
          if (actor.kind !== "human") {
            throw new ConnectError("Human authority is required", Code.PermissionDenied);
          }
          return { status: statusMessage(await dependencies.accounts.getSelfStatus(actor)) };
        }),
      getAccountStatus: async (request, context) =>
        guarded(async () => {
          const actor = await actorOf(dependencies.authentication, context);
          if (actor.kind !== "workload") {
            throw new ConnectError("Workload authority is required", Code.PermissionDenied);
          }
          if (request.account === undefined) {
            throw new ConnectError("Account reference is required", Code.InvalidArgument);
          }
          return {
            status: statusMessage(
              await dependencies.accounts.getAccountStatus(actor, {
                accountId: request.account.accountId,
                authorityIncarnation: request.account.authorityIncarnation,
              }),
            ),
          };
        }),
    });
    registerClosureRoutes(router, dependencies);
  };
}
