import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e', testMatch: 'offline.spec.ts',
  use: { baseURL: 'http://localhost:4173' },
  webServer: { command: 'npm run preview', port: 4173, reuseExistingServer: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
