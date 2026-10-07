import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '*.browser.spec.mjs', workers: 1, retries: 0,
  timeout: 60000, expect: { timeout: 10000 }, reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {},
  },
  webServer: { command: 'node scripts/serve-pilot.mjs', url: 'http://127.0.0.1:3100', reuseExistingServer: false },
});
