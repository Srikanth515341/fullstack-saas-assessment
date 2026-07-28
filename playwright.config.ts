import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  // Next.js dev mode compiles each route on first request — the first hit
  // to any given page/action in a freshly-started dev server can take
  // several seconds, well past Playwright's 5s default. Generous timeouts
  // here reflect dev-mode reality, not app slowness.
  timeout: 45_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    navigationTimeout: 30_000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Assumes `pnpm dev` (or `pnpm start`) is already running against a
  // migrated database — same assumption as the manual smoke tests from
  // Phase 1/6. Not auto-starting the server here since it depends on a
  // real Postgres connection this config can't provision itself.
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000
  }
});
