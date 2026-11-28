import { Code, ConnectError, type HandlerContext } from "@connectrpc/connect";
import type { AccountAuthentication } from "@agent-teams/identity-core";
import { rpcError } from "./rpc-errors.js";

export async function actorOf(authentication: AccountAuthentication, context: HandlerContext) {
  const authorization = context.requestHeader.get("authorization");
  if (
    authorization === null ||
    authorization.length > 8_200 ||
    !/^Bearer [A-Za-z0-9_.-]+$/u.test(authorization)
  ) {
    throw new ConnectError("Authentication is required", Code.Unauthenticated);
  }
  return authentication.authenticate(authorization.slice(7), context.signal);
}

export async function guarded<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    throw rpcError(error);
  }
}
