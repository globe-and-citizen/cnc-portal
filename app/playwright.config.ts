import { defineConfig, devices } from '@playwright/test'

// The Bank fixture deploys USDC and USDCe as the first two contracts on its
// fresh node; keep the Vite E2E build pointed at those deterministic addresses
// without rewriting the developer-local deployment artifact.
const E2E_USDC_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3'
const E2E_USDCE_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
const E2E_RPC_URL = 'http://127.0.0.1:8546'

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
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [['html'], ['list']],

  // Timeout for each test. 60s gives Vite's first dev compile (~10s in CI)
  // and the SIWE round-trip plenty of headroom without letting a broken
  // assertion hang the whole pipeline.
  timeout: 60_000,

  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Run in headless mode by default, unless HEADLESS=false
    headless: process.env.HEADLESS !== 'false'
  },

  // Web3 e2e runs on Chromium.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // The dedicated Hardhat port keeps the suite's deployment fixture isolated
  // from a developer's normal local node on :8545.
  webServer: process.env.SKIP_SERVER
    ? undefined
    : [
        {
          command: 'npm --prefix ../contract run node -- --port 8546',
          port: 8546,
          reuseExistingServer: false,
          timeout: 120000,
          stdout: 'pipe',
          stderr: 'pipe'
        },
        {
          command: 'npm run dev -- --port 5174',
          env: {
            ...process.env,
            VITE_E2E: 'true',
            VITE_APP_NETWORK_ALIAS: 'hardhat',
            VITE_E2E_RPC_URL: E2E_RPC_URL,
            VITE_E2E_USDC_ADDRESS: E2E_USDC_ADDRESS,
            VITE_E2E_USDCE_ADDRESS: E2E_USDCE_ADDRESS
          },
          port: 5174,
          reuseExistingServer: false,
          timeout: 120000,
          stdout: 'pipe',
          stderr: 'pipe'
        }
      ]
})
