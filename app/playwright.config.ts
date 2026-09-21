import { defineConfig, devices } from '@playwright/test'

// A developer-local Chromium can replace the Playwright download.
const E2E_BROWSER_EXECUTABLE = process.env.PLAYWRIGHT_BROWSER_EXECUTABLE

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Seed the deterministic mock tokens and Safe infrastructure before any
  // browser compiles the E2E client or an account fixture deploys contracts.
  globalSetup: process.env.SKIP_GLOBAL_SETUP ? undefined : './test/e2e/global-setup.ts',

  // Look for test files in the "test/e2e" directory, relative to this configuration file.
  testDir: './test/e2e',

  // Run all tests in parallel.
  fullyParallel: process.env.CI ? false : true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // E2E fixtures deploy into one dedicated Hardhat node. A single worker keeps
  // their deterministic token addresses stable across every account journey.
  workers: 1,

  // Reporter to use
  reporter: [['html'], ['list']],

  // Timeout for each test. 60s gives Vite's first dev compile (~10s in CI)
  // and the SIWE round-trip plenty of headroom without letting a broken
  // assertion hang the whole pipeline.
  timeout: 60_000,

  use: {
    // Use the same origin allowed by the developer-run backend CORS policy.
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Run in headless mode by default, unless HEADLESS=false
    headless: process.env.HEADLESS !== 'false'
  },

  // Web3 e2e runs on Chromium. PLAYWRIGHT_FIREFOX=true adds a Firefox pass of
  // the same journeys; the developer-local executable only applies to Chromium.
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(E2E_BROWSER_EXECUTABLE
          ? { launchOptions: { executablePath: E2E_BROWSER_EXECUTABLE } }
          : {})
      }
    },
    ...(process.env.PLAYWRIGHT_FIREFOX === 'true'
      ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }]
      : [])
  ]

  // Playwright never starts application services. Developers and CI prepare
  // the frontend, backend, database, and local chain before invoking a suite.
})
