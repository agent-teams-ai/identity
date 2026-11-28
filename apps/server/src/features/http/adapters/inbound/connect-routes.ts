import { Code, ConnectError, type ConnectRouter, type HandlerContext } from "@connectrpc/connect";
import { IdentityService } from "@agent-teams/identity-contracts";
import type { AccountApi, AccountAuthentication } from "@agent-teams/identity-core";
import { admissionMessage, statusMessage } from "./wire-mapping.js";
import { rpcError } from "./rpc-errors.js";

export interface IdentityHttpDependencies {
  readonly accounts: AccountApi;
  readonly authentication: AccountAuthentication;
}

async function actorOf(dependencies: IdentityHttpDependencies, context: HandlerContext) {
  const authorization = context.requestHeader.get("authorization");
  if (
    authorization === null ||
    authorization.length > 8_200 ||
    !/^Bearer [A-Za-z0-9_.-]+$/u.test(authorization)
  ) {
    throw new ConnectError("Authentication is required", Code.Unauthenticated);
  }
  return dependencies.authentication.authenticate(authorization.slice(7), context.signal);
}

async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw rpcError(error);
  }
}

export function identityRoutes(
  dependencies: IdentityHttpDependencies,
): (router: ConnectRouter) => void {
  return (router) => {
    router.service(IdentityService, {
      resolveSelf: async (request, context) =>
        guarded(async () => {
          const actor = await actorOf(dependencies, context);
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
          const actor = await actorOf(dependencies, context);
          if (actor.kind !== "human") {
            throw new ConnectError("Human authority is required", Code.PermissionDenied);
          }
          return { status: statusMessage(await dependencies.accounts.getSelfStatus(actor)) };
        }),
      getAccountStatus: async (request, context) =>
        guarded(async () => {
          const actor = await actorOf(dependencies, context);
          if (actor.kind !== "workload") {
            throw new ConnectError("Workload authority is required", Code.PermissionDenied);
          }
          if (request.account === undefined) {
            throw new ConnectError("Account reference is required", Code.InvalidArgument);
          }
          return {
            status: statusMessage(
              await dependencies.accounts.getAccountStatus(actor, request.account),
            ),
          };
        }),
    });
  };
}
