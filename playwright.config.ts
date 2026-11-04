import { defineConfig, devices } from '@playwright/test';

/**
 * BASE_URL picks the environment under test. It defaults to the live site.
 * To test a local copy, run the app's scripts/serve.ps1 and set
 * BASE_URL=http://localhost:8080 (the API only works on the deployed site).
 */
const BASE_URL = (process.env.BASE_URL ?? 'https://testautomation.marionobre.com').replace(/\/$/, '');

/**
 * Each run gets its own private API sandbox, so parallel runs (yours, CI's,
 * other people's) never see each other's data. Max 32 chars: [A-Za-z0-9_-].
 */
const SANDBOX_ID = process.env.SANDBOX_ID ?? `pw-${process.env.GITHUB_RUN_ID ?? Date.now()}`.slice(0, 32);
process.env.SANDBOX_ID = SANDBOX_ID;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: BASE_URL,
    testIdAttribute: 'data-testid',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        // A trailing slash so relative paths like 'users' resolve under /api/.
        baseURL: `${BASE_URL}/api/`,
        extraHTTPHeaders: { 'X-Sandbox-Id': SANDBOX_ID },
      },
    },
  ],
});
