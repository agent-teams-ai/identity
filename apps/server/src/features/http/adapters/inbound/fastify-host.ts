import Fastify, { LogController, type FastifyInstance } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";
import type { HttpHost } from "../../contracts/http.js";
import { identityRoutes, type IdentityHttpDependencies } from "./connect-routes.js";

export interface HttpHostOptions extends IdentityHttpDependencies {
  readonly ready: () => Promise<boolean>;
  readonly logging?: boolean;
}

function routes(server: FastifyInstance, options: HttpHostOptions, closing: () => boolean): void {
  // Connect writes the native response directly; headers must precede its handler.
  server.addHook("onRequest", async (_request, response) => {
    response.header("cache-control", "no-store");
    response.header("x-content-type-options", "nosniff");
  });
  server.get("/health/live", async () => ({ live: true }));
  server.get("/health/ready", async (_request, response) => {
    const ready = !closing() && (await options.ready().catch(() => false));
    if (!ready) {
      response.code(503);
    }
    return { ready };
  });
}

export async function createFastifyHost(options: HttpHostOptions): Promise<HttpHost> {
  const server = Fastify({
    bodyLimit: 8_192,
    http: { maxHeaderSize: 16_384 },
    connectionTimeout: 10_000,
    requestTimeout: 10_000,
    forceCloseConnections: true,
    logController: new LogController({ disableRequestLogging: true }),
    logger:
      options.logging === true
        ? {
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
            ],
          }
        : false,
  });
  let closePromise: Promise<void> | undefined;
  const close = (): Promise<void> => (closePromise ??= server.close());
  routes(server, options, () => closePromise !== undefined);
  try {
    await server.register(fastifyConnectPlugin, {
      routes: identityRoutes(options),
      connect: true,
      grpc: false,
      grpcWeb: false,
      readMaxBytes: 8_192,
      writeMaxBytes: 16_384,
      maxTimeoutMs: 5_000,
      shutdownTimeoutMs: 5_000,
    });
    return { listen: async (address) => server.listen(address), close };
  } catch (error) {
    await close();
    throw error;
  }
}
