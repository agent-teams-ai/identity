import { group } from "@get-modular/assembly";
import { createHttpEntry } from "./http.module.js";
import type { HttpHostOptions } from "../adapters/inbound/fastify-host.js";

export type { HttpHostOptions } from "../adapters/inbound/fastify-host.js";

export function createHttpGroup(options: HttpHostOptions) {
  const httpEntry = createHttpEntry(options);
  return group("http", [httpEntry]);
}
