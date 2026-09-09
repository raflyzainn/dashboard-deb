import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:5179', channel: 'msedge', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'node --import tsx scripts/pocketbase/e2e-server.ts', url: 'http://127.0.0.1:5179/login', reuseExistingServer: false, timeout: 180000 },
  reporter: 'list'
});
