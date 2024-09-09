import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Look for test files in the "test/e2e" directory, relative to this configuration file.
  testDir: './test/e2e',

  // Run all tests in parallel.
  fullyParallel: true,

  // Use half of the number of logical CPU cores for running tests in parallel.
  workers: undefined,

  // Test timeout is 2 minutes
  timeout: 120000,

  use: {
    baseURL: 'http://localhost:5173'
  },

  // Synpress currently only supports Chromium, however, this will change in the future.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'npm run dev',
    port: 5173
  }
})
