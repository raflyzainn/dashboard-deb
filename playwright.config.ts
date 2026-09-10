import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  testMatch: 'local-read.spec.ts',
  timeout: 90000,
  // Use the user's running environment; never start a fixture or seed/reset data.
  use: { baseURL: 'http://127.0.0.1:5176', channel: 'chrome', headless: true, trace: 'retain-on-failure' },
  reporter: 'list'
});
