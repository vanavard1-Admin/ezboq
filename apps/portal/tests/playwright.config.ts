import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

/**
 * Playwright Configuration
 * B4: QA Automation for Frontend
 * B-FIX-Auth: Auto-authentication with storageState
 */
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://127.0.0.1:3401';
const parsedBaseUrl = new URL(baseURL);
const webPort = parsedBaseUrl.port || '3000';
const webHost = parsedBaseUrl.hostname || 'localhost';
const devLoginKey = process.env.NEXT_PUBLIC_DEV_LOGIN_KEY || process.env.DEV_LOGIN_KEY || 'test-key';
const useDevBypass = process.env.PLAYWRIGHT_USE_DEV_BYPASS !== '0';
const workspaceDir = path.resolve(__dirname, '..');
const webServerCommand = `cd ${JSON.stringify(workspaceDir)} && npm run build && node ./scripts/serve-export.mjs --host ${webHost} --port ${webPort} --root out`;

if (useDevBypass) {
  process.env.PLAYWRIGHT_USE_DEV_BYPASS = '1';
  process.env.NEXT_PUBLIC_DEV_LOGIN = '1';
  process.env.NEXT_PUBLIC_DEV_LOGIN_KEY = devLoginKey;
  process.env.DEV_LOGIN_KEY = devLoginKey;
}

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    // B-FIX-Auth: Use saved auth state
    // Note: __dirname in config is the config file's directory (tests/)
    storageState: path.join(__dirname, '.auth', 'user.json'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000, // 2 minutes for Next.js to start
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
