import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { promisify } from 'node:util';
import { filesBelow } from './build-evidence.ts';

const execute = promisify(execFile);
const root = process.cwd();
const contracts = resolve(root, 'packages/contracts');
const binaryRoot = resolve(root, 'node_modules/.bin');
const environment = { ...process.env, PATH: `${binaryRoot}:${process.env.PATH ?? ''}`,
  GOTOOLCHAIN: 'local', GOWORK: 'off' };
const generated = [
  'src/features/protocol/contracts/gen/identity/v1/identity_pb.ts',
  'gen/go/identity/v1/identity.pb.go',
  'gen/go/identity/v1/identityv1connect/identity.connect.go',
].toSorted();

const run = async (command: string, args: readonly string[], cwd = contracts): Promise<string> => {
  const result = await execute(command, [...args], { cwd, env: environment,
    encoding: 'utf8', timeout: 180_000, maxBuffer: 4 * 1024 * 1024 });
  return result.stdout.trim();
};

const verifyVersions = async (): Promise<void> => {
  assert.equal(await run('buf', ['--version']), '1.75.0', 'Native Buf pin differs');
  assert.equal(await run('protoc-gen-es', ['--version']), 'protoc-gen-es v2.17.0', 'ES generator pin differs');
  assert.equal(await run('protoc-gen-go', ['--version']), 'protoc-gen-go v1.36.12', 'Go generator pin differs');
  assert.equal(await run('protoc-gen-connect-go', ['--version']), '1.21.1', 'Connect generator pin differs');
  assert.ok((await run('go', ['version'])).startsWith('go version go1.27.3 '), 'Native Go pin differs');
};

const inputBytes = async (): Promise<readonly { path: string; content: string }[]> => {
  const paths = [join(contracts, 'buf.yaml'), join(contracts, 'buf.gen.yaml'),
    ...await filesBelow(join(contracts, 'proto')),
    ...await filesBelow(join(contracts, 'src/features/protocol/contracts/gen')),
    ...await filesBelow(join(contracts, 'gen/go'))].toSorted();
  return Promise.all(paths.map(async (path) => ({ path, content: (await readFile(path)).toString('base64') })));
};

const requireNativeTests = (output: string): void => {
  const required = new Set(['TestStatusWireVector', 'TestUnknownAndAbsentValuesDoNotBecomeActiveEvidence']);
  for (const line of output.split('\n')) {
    const event: unknown = JSON.parse(line);
    assert.ok(typeof event === 'object' && event !== null, 'Invalid native Go test event');
    if ('Action' in event && event.Action === 'pass' && 'Test' in event && typeof event.Test === 'string') {
      required.delete(event.Test);
    }
  }
  assert.equal(required.size, 0, 'Mandatory Go protocol vectors did not execute successfully');
};

const checkGenerated = async (temporary: string): Promise<void> => {
  await cp(join(contracts, 'proto'), join(temporary, 'proto'), { recursive: true, errorOnExist: true });
  for (const name of ['buf.yaml', 'buf.gen.yaml']) {
    await cp(join(contracts, name), join(temporary, name), { errorOnExist: true });
  }
  await run('buf', ['generate'], temporary);
  const actual = [
    ...await filesBelow(join(temporary, 'src/features/protocol/contracts/gen')),
    ...await filesBelow(join(temporary, 'gen/go')),
  ].map((path) => relative(temporary, path).replaceAll('\\', '/')).toSorted();
  assert.deepEqual(actual, generated, 'Native generator artifact inventory differs');
  for (const path of generated) {
    assert.deepEqual(await readFile(join(temporary, path)), await readFile(join(contracts, path)),
      `Generated protocol artifact drift: ${path}`);
  }
};

const before = await inputBytes();
const temporary = await mkdtemp(join(tmpdir(), 'identity-contract-check-'));
try {
  await verifyVersions();
  await run('buf', ['lint']);
  await run('buf', ['build', '--output', join(temporary, 'descriptor.bin')]);
  await checkGenerated(temporary);
  requireNativeTests(await run('go', ['test', '-count=1', '-json', '-mod=readonly', './...'], join(contracts, 'gen/go')));
  assert.deepEqual(await inputBytes(), before, 'Contract sources changed during the read-only check');
  process.stdout.write('Identity contracts: native schema, deterministic bindings and required Go vectors passed.\n');
} finally {
  await rm(temporary, { recursive: true, force: true });
}
