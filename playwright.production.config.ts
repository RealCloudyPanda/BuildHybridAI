import { defineConfig, devices } from '@playwright/test';
const base = process.env.REPRO_BASE_PATH || '/';
export default defineConfig({
  testDir: 'e2e', testMatch: 'offline.spec.ts',
  use: { baseURL: `http://localhost:4173${base}` },
  webServer: { command: `npm run preview -- --base ${base}`, port: 4173, reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
