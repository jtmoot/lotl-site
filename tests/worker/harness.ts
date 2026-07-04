// Spawns `wrangler dev` (local mode: miniflare + local D1 sqlite) so the API
// tests exercise the real Worker over HTTP — same shape as production.
import { spawn, execSync, type ChildProcess } from 'node:child_process';

const PORT = 8788;
export const BASE = `http://127.0.0.1:${PORT}`;

let child: ChildProcess | undefined;

export async function startWorker(): Promise<void> {
  // Fresh local D1 every run: keep test state out of the repo's dev database.
  execSync('rm -rf .wrangler/test-state', { stdio: 'ignore' });
  execSync(
    'npx wrangler d1 migrations apply lotl-comments --local --persist-to .wrangler/test-state',
    { stdio: 'ignore' }
  );
  child = spawn(
    'npx',
    ['wrangler', 'dev', '--port', String(PORT), '--persist-to', '.wrangler/test-state'],
    { stdio: 'ignore', detached: false }
  );
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      // Any HTTP response (even 404) means the server is up.
      await fetch(`${BASE}/api/health-probe`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error('wrangler dev did not become ready within 30s');
}

export function stopWorker(): void {
  child?.kill('SIGTERM');
}
