import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { startServer } from "../../../src/composition/server.root.js";

// This native entry owns the real Identity service while GetTok's production BFF,
// PostgreSQL stores and browser run in its child test. All inputs target disposable
// loopback fixtures; a missing repository, browser or named test is a failure.
const execute = promisify(execFile);
const required = (name: string): string => {
  const value = process.env[name];
  assert.ok(value !== undefined && value.length > 0, `Native consumer requires ${name}`);
  return value;
};
// Surface only GetTok's fixed domain labels after a NoError assertion in the
// exact native test. Parsing test2json keeps unrelated output and arbitrary
// error text private, including labels embedded in provider response bodies.
const nativeFailureKinds = (output: string): string[] => {
  const labels = new Map([
    ["central identity evidence is invalid", "evidence_invalid"],
    ["central identity session requires authentication", "session_expired"],
    ["central identity account is not active", "account_inactive"],
    ["central identity continuity proof is required", "proof_required"],
    ["central identity observation is stale", "evidence_stale"],
    ["central identity binding conflicts", "conflict"],
    ["central identity is unavailable", "unavailable"],
  ]);
  const kinds = new Set<string>();
  let unexpectedError = false;
  for (const line of output.split("\n")) {
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      unexpectedError = false;
      continue;
    }
    if (
      event === null ||
      typeof event !== "object" ||
      !("Action" in event) ||
      event.Action !== "output" ||
      !("Package" in event) ||
      event.Package !== "github.com/TokenFlux/TokenRouter/internal/app" ||
      !("Test" in event) ||
      event.Test !== "TestCentralNativeBFFCookieFlow" ||
      !("Output" in event) ||
      typeof event.Output !== "string"
    ) {
      unexpectedError = false;
      continue;
    }
    for (const part of event.Output.trimEnd().split("\n")) {
      const text = part.trim();
      if (unexpectedError) {
        const kind = labels.get(text);
        if (kind !== undefined) {
          kinds.add(kind);
        }
      }
      unexpectedError = /^Error:\s+Received unexpected error:$/u.test(text);
    }
  }
  return [...kinds];
};
const databaseUrl = required("IDENTITY_TEST_DATABASE_URL");
const database = new URL(databaseUrl);
assert.ok(
  database.pathname === "/identity_test" && ["127.0.0.1", "[::1]"].includes(database.hostname),
  "Only the isolated Identity database is admitted",
);
const issuer = required("IDENTITY_TEST_ISSUER");
assert.equal(new URL(issuer).origin, "http://127.0.0.1:18080");
const gettok = resolve(required("GETTOK_NATIVE_REPOSITORY"));
const go = required("GETTOK_NATIVE_GO");
const binary = required("PRIVATE_GETTOK_NATIVE_TEST_BINARY");
required("GETTOK_NATIVE_BROWSER_COMMAND");
required("GETTOK_NATIVE_DATABASE_URL");

const interruption = new AbortController();
const interrupt = (): void => {
  interruption.abort(new Error("Native GetTok qualification interrupted"));
};
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);

const server = await startServer({
  databaseUrl,
  host: "127.0.0.1",
  port: 18183,
  authentication: {
    issuer,
    authorityId: "keycloak-test",
    authorityIncarnation: "keycloak-test-v1",
    clients: [
      {
        kind: "human",
        clientId: "gettok-test-bff",
        consumerId: "gettok",
        providerControlPolicyId: "gettok-ordinary-login",
        policyVersion: "1",
      },
      { kind: "workload", clientId: "gettok-test-workload", consumerId: "gettok" },
      { kind: "terminal-workload", clientId: "gettok-test-terminal", consumerId: "gettok" },
    ],
  },
});

try {
  let stdout: string | undefined;
  try {
    const result = await execute(
      go,
      [
        "tool",
        "test2json",
        "-t",
        "-p",
        "github.com/TokenFlux/TokenRouter/internal/app",
        binary,
        "-test.v=test2json",
        "-test.run=^TestCentralNativeBFFCookieFlow$",
        "-test.count=1",
        "-test.timeout=180s",
      ],
      {
        cwd: resolve(gettok, "backend"),
        env: {
          ...process.env,
          GETTOK_NATIVE_IDENTITY_URL: server.address,
          GETTOK_NATIVE_ORIGIN: "http://127.0.0.1:18182",
          GETTOK_NATIVE_LIFECYCLE_COMMAND: JSON.stringify([
            process.execPath,
            resolve(
              ".test-build/packages/identity/tests/features/account/account-lifecycle.native.js",
            ),
          ]),
        },
        encoding: "utf8",
        timeout: 300_000,
        killSignal: "SIGINT",
        maxBuffer: 2_097_152,
        signal: interruption.signal,
      },
    );
    stdout = result.stdout;
  } catch (error) {
    // Keep complete child diagnostics in a private file. Public failure reports
    // retain source locations and bounded fixture stages without serializing
    // assertion values, authorization URLs, cookies or the exec error's pipes.
    const diagnostic = (name: "stdout" | "stderr"): string => {
      if (typeof error !== "object" || error === null) {
        return "";
      }
      const value: unknown = Reflect.get(error, name);
      return typeof value === "string" ? value : "";
    };
    const output = diagnostic("stdout") + diagnostic("stderr");
    const directory = await mkdtemp(resolve(tmpdir(), "identity-gettok-native-"));
    await writeFile(resolve(directory, "consumer.log"), output, { mode: 0o600 });
    process.stderr.write(
      `${JSON.stringify({
        nativeGetTokConsumer: "failed",
        diagnostics: directory,
        failureKinds: nativeFailureKinds(diagnostic("stdout")),
        locations: [...new Set(output.match(/[\w./-]+\.go:\d+(?::\d+)?/g) ?? [])],
        stages: [
          ...new Set(
            [...output.matchAll(/nativeGetTokStage\\?"\s*:\s*\\?"([a-z-]+)/g)].map(
              (match) => match[1],
            ),
          ),
        ],
        browserPhases: [...new Set(output.match(/(?:\\?"phase\\?"):\\?"[a-z-]+\\?"/g) ?? [])],
      })}\n`,
    );
  }
  assert.ok(
    stdout !== undefined,
    "Native GetTok process failed; private diagnostics and bounded stages were recorded",
  );
  let completed = 0;
  let browser = false;
  let closure = false;
  for (const line of stdout.trim().split("\n")) {
    const event: unknown = JSON.parse(line);
    assert.ok(event !== null && typeof event === "object" && "Action" in event);
    assert.notEqual(event.Action, "fail", "No failed Go package or test is admitted");
    assert.notEqual(event.Action, "skip", "Native consumer checks must not be skipped");
    if ("Test" in event && event.Test === "TestCentralNativeBFFCookieFlow") {
      if (event.Action === "pass") {
        completed += 1;
      }
      if (
        "Output" in event &&
        typeof event.Output === "string" &&
        event.Output.includes('"nativeGetTokBrowser":"passed"')
      ) {
        browser = true;
      }
      if (
        "Output" in event &&
        typeof event.Output === "string" &&
        event.Output.includes('"nativeGetTokClosure":"passed"')
      ) {
        closure = true;
      }
    }
  }
  assert.equal(completed, 1, "The exact native GetTok test must finish successfully once");
  assert.ok(browser, "The actual browser must publish its bounded completion witness");
  assert.ok(closure, "Actual terminal delivery must publish its bounded closure witness");
  process.stdout.write(
    `${JSON.stringify({
      nativeGetTokConsumer: "passed",
      identity: "production-composition",
      transport: "actual-connect-and-http",
      browser: "actual-chromium",
      terminalClosure: "passed",
      independentContinuity: "not-admitted",
    })}\n`,
  );
} finally {
  try {
    assert.ok((await server.close()).complete, "Native Identity resources must close completely");
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
  }
}
