import assert from "node:assert/strict";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  appendFile,
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve as pathResolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { readKeycloakRuntime } from "./keycloak-runtime.ts";
import { prepareTestRuntime } from "./test-runtime.ts";

const execute = promisify(execFile);
assert.ok(
  process.argv.length === 2 ||
    (process.argv.length === 3 && process.argv[2] === "--consumer=gettok"),
  "Native qualification accepts only the optional --consumer=gettok selector",
);
const withGetTok = process.argv[2] === "--consumer=gettok";
assert.equal(
  process.env.PRIVATE_GETTOK_NATIVE_TEST_BINARY,
  undefined,
  "The native consumer binary must be built by this launcher, never supplied externally",
);
const runtime = await readKeycloakRuntime();
const interruption = new AbortController();
const interrupt = (): void => {
  interruption.abort(new Error("Native qualification interrupted"));
};
process.once("SIGINT", interrupt);
process.once("SIGTERM", interrupt);
const required = (name: string): string => {
  const value = process.env[name];
  assert.ok(value !== undefined && value.length > 0, `Native qualification requires ${name}`);
  return value;
};
const database = (name: string, expected: string): URL => {
  const url = new URL(required(name));
  assert.ok(
    ["postgres:", "postgresql:"].includes(url.protocol) &&
      url.pathname === `/${expected}` &&
      ["127.0.0.1", "[::1]"].includes(url.hostname),
    "Native qualification requires isolated loopback databases",
  );
  return url;
};
const keycloak = pathResolve(required("KEYCLOAK_HOME"));
const java = join(pathResolve(required("JAVA_HOME")), "bin/java");
const issuer = new URL(required("IDENTITY_TEST_ISSUER"));
assert.ok(
  issuer.protocol === "http:" &&
    issuer.hostname === "127.0.0.1" &&
    issuer.pathname === "/realms/identity-test" &&
    issuer.search === "" &&
    issuer.hash === "",
  "Only the exact loopback TEST issuer is admitted",
);
const identityDatabase = database("IDENTITY_TEST_DATABASE_URL", "identity_test");
const keycloakDatabase = database("KEYCLOAK_TEST_DATABASE_URL", "keycloak_test");
const gettokDatabase = withGetTok
  ? database("GETTOK_NATIVE_DATABASE_URL", "gettok_identity_test")
  : undefined;
if (withGetTok) {
  for (const name of [
    "GETTOK_NATIVE_REPOSITORY",
    "GETTOK_NATIVE_GO",
    "GETTOK_NATIVE_BROWSER_COMMAND",
  ]) {
    required(name);
  }
}
for (const secret of [
  "IDENTITY_TEST_CLIENT_SECRET",
  "IDENTITY_TEST_WORKLOAD_SECRET",
  "IDENTITY_TEST_USER_PASSWORD",
]) {
  required(secret);
}
const logs = await mkdtemp(join(tmpdir(), "identity-keycloak-native-"));
const gettokBinary = withGetTok ? join(logs, "gettok-native.test") : undefined;
const environment = {
  ...process.env,
  IDENTITY_TEST_SECOND_CLIENT_SECRET: randomBytes(32).toString("hex"),
  IDENTITY_TEST_SECOND_WORKLOAD_SECRET: randomBytes(32).toString("hex"),
  KC_BOOTSTRAP_ADMIN_CLIENT_ID: "identity-disposable-native-admin",
  KC_BOOTSTRAP_ADMIN_CLIENT_SECRET: randomBytes(32).toString("hex"),
  JAVA_OPTS:
    "-Xms64m -Xmx256m -XX:MaxMetaspaceSize=192m -XX:ReservedCodeCacheSize=48m -XX:MaxDirectMemorySize=32m -XX:-UseBASE64Intrinsics -XX:+UseSerialGC",
  KC_DB: "postgres",
  KC_DB_URL: `jdbc:postgresql://${keycloakDatabase.host}/keycloak_test`,
  KC_DB_USERNAME: decodeURIComponent(keycloakDatabase.username),
  KC_DB_PASSWORD: decodeURIComponent(keycloakDatabase.password),
  KC_HTTP_ENABLED: "true",
  KC_HTTP_HOST: issuer.hostname,
  KC_HTTP_PORT: issuer.port || "80",
  KC_HOSTNAME: issuer.origin,
  KC_CACHE: "local",
};

const run = async (
  command: string,
  args: readonly string[],
  extra: Readonly<Record<string, string>> = {},
  timeout = 180_000,
  cwd = process.cwd(),
) =>
  execute(command, [...args], {
    cwd,
    env: { ...environment, ...extra },
    encoding: "utf8",
    timeout,
    maxBuffer: 1_048_576,
    signal: interruption.signal,
  });

const prepareGetTok = async (): Promise<void> => {
  if (gettokBinary === undefined) {
    return;
  }
  const consumerRoot = pathResolve(required("GETTOK_NATIVE_REPOSITORY"), "backend");
  const moduleSource = await readFile(join(consumerRoot, "go.mod"), "utf8");
  // The pinned consumer owns the same exact compiler directive used by setup-go.
  // A separate toolchain override requires its own qualification.
  const compilerDirectives = moduleSource
    .split(/\r?\n/u)
    .filter((line) => /^\s*(?:go|toolchain)(?:\s|$)/u.test(line));
  assert.equal(compilerDirectives.length, 1, "Native GetTok requires one compiler directive");
  const expectedGo = compilerDirectives[0]?.match(/^go ([1-9]\d*\.\d+\.\d+)$/u)?.[1];
  assert.ok(expectedGo !== undefined, "Native GetTok requires an exact go.mod patch version");
  const go = required("GETTOK_NATIVE_GO");
  const version = await run(go, ["version"], { GOTOOLCHAIN: "local", GOWORK: "off" });
  assert.ok(
    version.stdout.startsWith(`go version go${expectedGo} `),
    "Native GetTok Go version differs from its go.mod authority",
  );
  let compiled = false;
  const started = performance.now();
  try {
    const result = await run(
      go,
      [
        "test",
        "-c",
        "-mod=readonly",
        "-p=1",
        "-tags=integration,native_identity,embed",
        "-o",
        gettokBinary,
        "./internal/app",
      ],
      { GOTOOLCHAIN: "local", GOWORK: "off" },
      900_000,
      consumerRoot,
    );
    await writeFile(join(logs, "consumer-build.log"), result.stdout + result.stderr, {
      mode: 0o600,
    });
    compiled = true;
  } catch (error) {
    const stderr =
      typeof error === "object" &&
      error !== null &&
      "stderr" in error &&
      typeof error.stderr === "string"
        ? error.stderr
        : "Native compiler failed before captured diagnostics.";
    await writeFile(join(logs, "consumer-build.log"), stderr, { mode: 0o600 });
    process.stderr.write(
      `${JSON.stringify({
        nativeGetTokCompilation: "failed",
        elapsedMilliseconds: Math.round(performance.now() - started),
        interruptionRequested: interruption.signal.aborted,
        commandKilled:
          typeof error === "object" && error !== null && "killed" in error && error.killed === true,
        diagnostics: join(logs, "consumer-build.log"),
      })}\n`,
    );
  }
  assert.ok(compiled, `Native GetTok compilation failed; private diagnostics: ${logs}`);
  const state = await lstat(gettokBinary);
  assert.ok(
    state.isFile() && !state.isSymbolicLink() && (state.mode & 0o111) !== 0,
    "Native Go compiler must produce an owned regular executable",
  );
};

const sql = async (url: URL, args: readonly string[]): Promise<string> => {
  const result = await run(
    process.env.PSQL_BIN ?? "psql",
    ["--no-psqlrc", "-v", "ON_ERROR_STOP=1", "-A", "-t", ...args],
    {
      PGHOST: url.hostname.replaceAll("[", "").replaceAll("]", ""),
      PGPORT: url.port || "5432",
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: url.pathname.slice(1),
      PGCONNECT_TIMEOUT: "5",
    },
  );
  return result.stdout.trim();
};

const prepareDatabases = async (): Promise<void> => {
  for (const url of [
    identityDatabase,
    keycloakDatabase,
    ...(gettokDatabase ? [gettokDatabase] : []),
  ]) {
    assert.equal(
      await sql(url, ["-c", "SHOW server_version_num"]),
      runtime.postgresql.versionNumber,
      "Native database version differs",
    );
    assert.equal(
      await sql(url, [
        "-c",
        "SELECT count(*) FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','p','v','m','S')",
      ]),
      "0",
      "Native qualification requires fresh test databases; it never truncates existing data",
    );
  }
  await sql(identityDatabase, [
    "-f",
    "packages/identity/src/features/account/adapters/outbound/migrations/0001_accounts.sql",
  ]);
};

const prepareProvider = async (): Promise<void> => {
  const version = await run(java, ["-version"]);
  assert.ok(
    (version.stdout + version.stderr).includes(`version "${runtime.java.version}"`),
    "Native JVM version differs",
  );
  const providerVersion = await run(join(keycloak, "bin/kc.sh"), ["--version"]);
  assert.ok(
    (providerVersion.stdout + providerVersion.stderr).includes(
      `Keycloak ${runtime.keycloak.version}`,
    ),
    "Native Keycloak version differs",
  );
  const importDirectory = join(keycloak, "data/import");
  await mkdir(importDirectory, { recursive: true });
  await copyFile(
    "deploy/keycloak/realm-test.json",
    join(importDirectory, "identity-test-realm.json"),
  );
  const build = await run(join(keycloak, "bin/kc.sh"), ["build", "--db=postgres"]);
  await appendFile(join(logs, "provider-build.log"), build.stdout + build.stderr);
};

interface Completion {
  readonly code?: number | null;
  readonly signal?: NodeJS.Signals | null;
  readonly error?: Error;
}
interface Tracked {
  readonly child: ChildProcess;
  readonly completed: Promise<Completion>;
}
const track = (child: ChildProcess): Tracked => ({
  child,
  completed: new Promise<Completion>((resolve) => {
    child.once("error", (error) => {
      resolve({ error });
    });
    child.once("close", (code, signal) => {
      resolve({ code, signal });
    });
  }),
});
const providerRunning = (process: Tracked): boolean =>
  process.child.pid !== undefined &&
  process.child.exitCode === null &&
  process.child.signalCode === null;

const awaitReady = async (process: Tracked): Promise<void> => {
  const deadline = performance.now() + 120_000;
  while (performance.now() < deadline) {
    interruption.signal.throwIfAborted();
    assert.ok(providerRunning(process), `Keycloak exited before readiness; diagnostics: ${logs}`);
    try {
      const response = await fetch(`${issuer.href}/.well-known/openid-configuration`, {
        redirect: "error",
        signal: AbortSignal.any([interruption.signal, AbortSignal.timeout(2_000)]),
      });
      if (response.ok) {
        const metadata: unknown = await response.json();
        if (
          typeof metadata === "object" &&
          metadata !== null &&
          "issuer" in metadata &&
          metadata.issuer === issuer.href
        ) {
          return;
        }
      } else {
        await response.body?.cancel();
      }
    } catch {
      interruption.signal.throwIfAborted();
    }
    await delay(1_000, undefined, { signal: interruption.signal });
  }
  throw new Error(`Keycloak readiness deadline; diagnostics: ${logs}`);
};

const stop = async (process: Tracked): Promise<void> => {
  // A provider that already exited, including by signal, cannot acquire a
  // successful shutdown witness. kc.sh forwards our TERM to Java and preserves
  // its exit status; 143 is its documented shell translation of SIGTERM.
  const requested = providerRunning(process) && process.child.kill("SIGTERM");
  const completion = await Promise.race([
    process.completed,
    delay(15_000, undefined, { ref: false }),
  ]);
  if (completion === undefined) {
    process.child.kill("SIGKILL");
    await Promise.race([process.completed, delay(5_000, undefined, { ref: false })]);
    throw new Error("Native Keycloak did not stop gracefully");
  }
  assert.equal(completion.error, undefined, "Native provider process failed to launch");
  assert.ok(requested, "Native provider exited before its requested shutdown");
  assert.ok(
    (completion.signal === "SIGTERM" && completion.code === null) ||
      (completion.signal === null && (completion.code === 0 || completion.code === 143)),
    "Native provider did not finish its requested shutdown cleanly",
  );
};

try {
  await prepareDatabases();
  await prepareGetTok();
  await prepareProvider();
  await prepareTestRuntime();
  const log = await open(join(logs, "provider.log"), "w");
  const provider = track(
    spawn(join(keycloak, "bin/kc.sh"), ["start", "--optimized", "--import-realm"], {
      cwd: keycloak,
      env: environment,
      stdio: ["ignore", log.fd, log.fd],
    }),
  );
  try {
    await awaitReady(provider);
    for (const entry of [
      ...(process.env.IDENTITY_TEST_NATIVE_BROKER_ADMIN === "true"
        ? ["tools/provision-keycloak-brokers.native.js"]
        : []),
      "packages/identity/tests/features/account/keycloak-profile.native.js",
      "apps/server/tests/features/http/keycloak-service.native.js",
      ...(withGetTok ? ["apps/server/tests/features/http/gettok-consumer.native.js"] : []),
    ]) {
      const result = await run(
        process.execPath,
        [pathResolve(".test-build", entry)],
        entry.endsWith("gettok-consumer.native.js") && gettokBinary !== undefined
          ? { PRIVATE_GETTOK_NATIVE_TEST_BINARY: gettokBinary, GOTOOLCHAIN: "local", GOWORK: "off" }
          : {},
        entry.endsWith("gettok-consumer.native.js") ? 360_000 : 180_000,
      );
      process.stdout.write(result.stdout);
      assert.ok(providerRunning(provider), "Provider exited during native qualification");
    }
  } finally {
    try {
      await stop(provider);
    } finally {
      await log.close();
    }
  }
} finally {
  if (gettokBinary !== undefined) {
    await rm(gettokBinary, { force: true });
  }
  process.removeListener("SIGINT", interrupt);
  process.removeListener("SIGTERM", interrupt);
}
interruption.signal.throwIfAborted();
process.stdout.write(
  `${JSON.stringify({
    nativeKeycloakAndIdentity: "passed",
    ...(withGetTok ? { nativeGetTok: "passed" } : {}),
    providerVersion: runtime.keycloak.version,
    postgresVersion: runtime.postgresql.version,
    javaVersion: runtime.java.version,
    realmSha256: createHash("sha256")
      .update(await readFile("deploy/keycloak/realm-test.json"))
      .digest("hex"),
  })}\n`,
);
