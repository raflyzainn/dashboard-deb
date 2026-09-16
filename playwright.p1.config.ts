import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:['p1-backend.spec.ts','change-password.spec.ts','page-payload.spec.ts','campus-indicators.spec.ts','periods.spec.ts','proposals.spec.ts'],workers:1,fullyParallel:false,timeout:90000,
  use:{baseURL:'http://127.0.0.1:5177',channel:'chrome',headless:true},reporter:'list'
});
