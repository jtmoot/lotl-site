import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against `wrangler dev` serving the built static output PLUS
// the real Worker (/api/* with a fresh local D1) — the same shape as
// production, not just the static half.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npx wrangler dev --port 4321 --persist-to .wrangler/e2e-state',
    url: 'http://localhost:4321',
    // Never reuse: each run gets the fresh D1 seeded by test:e2e's migration step.
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
