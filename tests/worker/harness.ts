// Spawns `wrangler dev` (local mode: miniflare + local D1 sqlite) so the API
// tests exercise the real Worker over HTTP — same shape as production.
//
// Several test files share this harness and run one after another on the same
// port, so start/stop are careful: stop kills the whole process group and waits
// for the port to close before returning, and start waits for the port to be
// free before wiping the D1 state. Otherwise a lingering old server keeps
// answering with its database deleted from under it (500s in CI).
import { spawn, execSync, type ChildProcess } from 'node:child_process';

const PORT = 8788;
export const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess | undefined;

async function portOpen(): Promise<boolean> {
  try {
    // Any HTTP response (even 404) means a server is up.
    await fetch(`${BASE}/api/health-probe`);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(cond: () => Promise<boolean>, ms: number, what: string): Promise<void> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await cond()) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timed out after ${ms}ms waiting for ${what}`);
}

export async function startWorker(): Promise<void> {
  await waitFor(async () => !(await portOpen()), 15_000, `port ${PORT} to be free`);

  // Fresh local D1 every run: keep test state out of the repo's dev database.
  execSync('rm -rf .wrangler/test-state', { stdio: 'ignore' });
  execSync(
    'npx wrangler d1 migrations apply lotl-comments --local --persist-to .wrangler/test-state',
    { stdio: 'ignore' }
  );
  child = spawn(
    'npx',
    ['wrangler', 'dev', '--port', String(PORT), '--persist-to', '.wrangler/test-state'],
    // Own process group so stopWorker can take down npx -> wrangler -> workerd together.
    { stdio: 'ignore', detached: true }
  );
  await waitFor(portOpen, 30_000, 'wrangler dev to become ready');
}

export async function stopWorker(): Promise<void> {
  const proc = child;
  child = undefined;
  if (!proc?.pid) return;
  const exited = new Promise<void>((resolve) => {
    if (proc.exitCode !== null || proc.signalCode !== null) return resolve();
    proc.once('exit', () => resolve());
  });
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    proc.kill('SIGTERM');
  }
  const timer = setTimeout(() => {
    try { process.kill(-proc.pid!, 'SIGKILL'); } catch { /* already gone */ }
  }, 5_000);
  await exited;
  clearTimeout(timer);
  await waitFor(async () => !(await portOpen()), 15_000, `port ${PORT} to close`);
}
