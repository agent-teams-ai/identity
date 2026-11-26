import { serverConfiguration } from './composition/configuration.js';
import { startServer } from './composition/server.root.js';

try {
  const server = await startServer(serverConfiguration(process.env));
  process.stdout.write(`${JSON.stringify({ event: 'identity.listening', address: server.address })}\n`);
  let closing = false;
  const shutdown = async (): Promise<void> => {
    if (closing) return;
    closing = true;
    const report = await server.close();
    if (!report.complete) {
      process.stderr.write(`${JSON.stringify({ event: 'identity.cleanup-incomplete',
        debts: report.debts.map((debt) => ({ path: debt.path, state: debt.state })) })}\n`);
      process.exitCode = 1;
    }
  };
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
} catch {
  process.stderr.write('Identity startup failed\n');
  process.exitCode = 1;
}
