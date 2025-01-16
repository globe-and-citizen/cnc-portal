import { defineConfig, devices } from '@playwright/test'

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Look for test files in the "test/e2e" directory, relative to this configuration file.
  testDir: './test/e2e',

  // Run all tests in parallel.
  fullyParallel: process.env.CI ? false : true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Use half of the number of logical CPU cores for running tests in parallel.
  workers: undefined,

  // Reporter to use
  reporter: 'html',

  // Disable timeout
  timeout: 300000,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry' // record traces on first retry of each test
  },

  // Synpress currently only supports Chromium, however, this will change in the future.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  webServer: {
    command: 'VITE_APP_NETWORK_ALIAS=hardhat npm run dev',
    port: 5173,
    reuseExistingServer: true
  }
})
