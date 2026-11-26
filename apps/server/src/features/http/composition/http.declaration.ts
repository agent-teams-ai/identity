import { declareModule } from "@get-modular/assembly";
import { HttpHostContract } from "./http.contracts.js";

export const httpDeclaration = declareModule({
  moduleId: "identity/http",
  implementationId: "identity/http-fastify-connect",
  owner: { authority: "agent-teams-identity", path: ["http"] },
  provides: [HttpHostContract.provide()],
  slots: [],
});
