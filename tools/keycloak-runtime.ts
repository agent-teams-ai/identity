import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const record = (value: unknown): Record<string, unknown> => {
  assert.ok(isRecord(value), "Invalid native runtime record");
  return value;
};
const text = (value: unknown): string => {
  assert.ok(
    typeof value === "string" && value.length > 0 && value.length <= 256,
    "Invalid native runtime version",
  );
  return value;
};

export const readKeycloakRuntime = async () => {
  const parsed: unknown = JSON.parse(await readFile("deploy/keycloak/runtime.json", "utf8"));
  const root = record(parsed);
  assert.equal(root.schemaVersion, 1, "Unsupported native runtime metadata");
  const keycloak = record(root.keycloak);
  const java = record(root.java);
  const postgresql = record(root.postgresql);
  return {
    keycloak: { version: text(keycloak.version) },
    java: { version: text(java.version) },
    postgresql: {
      version: text(postgresql.version),
      versionNumber: text(postgresql.versionNumber),
    },
  };
};
