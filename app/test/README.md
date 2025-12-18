# E2E Testing with Synpress + Playwright

This directory contains end-to-end (E2E) tests for the CNC Portal application using Synpress and Playwright to test Web3 wallet interactions.

## 📋 Overview

- **Testing Framework**: Playwright 1.48.2
- **Web3 Testing**: Synpress 4.0.3
- **Browser**: Chromium (headless mode)
- **Wallet**: MetaMask extension (v11.9.1)

## 🚀 Quick Start

### Prerequisites

1. Node.js v22+ installed
2. Dependencies installed: `npm install`
3. Playwright browsers installed: `npx playwright install chromium`

### Build Synpress Cache (First Time Setup)

The Synpress cache must be built before running tests. This sets up MetaMask with test wallet credentials:

```bash
npm run test:build:cache
```

**Note**: The cache build may show errors at the end related to MetaMask UI interactions, but as long as the `.cache-synpress` directory is created, the cache is usable.

### Running Tests

```bash
# Run all E2E tests (headless mode)
npm run test:e2e

# Run with headed browser (for debugging)
npm run test:e2e:headed

# Run with Playwright UI (interactive mode)
npm run test:e2e:ui

# Run in debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

## 📁 Project Structure

```md
test/
├── e2e/ # E2E test files
│ ├── dashboard.spec.ts # Dashboard tests
│ ├── login.spec.ts # Authentication tests
│ ├── navbar.spec.ts # Navigation tests
│ └── teams.spec.ts # Team management tests
├── wallet-setup/ # MetaMask wallet configurations
│ └── connected.setup.ts # Standard wallet setup
└── sypress.ts # Synpress test configuration
```

## 🔧 Configuration

### Environment Variables

E2E tests use environment variables from `.env.e2e`:

```env
# App Configuration
VITE_APP_BACKEND_URL=http://localhost:3000
VITE_APP_NETWORK_ALIAS=hardhat
VITE_APP_CHAIN_ID=31337

# Test Configuration
BASE_URL=http://localhost:5173
SKIP_SERVER=false
HEADLESS=true

# MetaMask Configuration
METAMASK_SECRET_WORDS="test test test test test test test test test test test junk"
METAMASK_PASSWORD="Password123"

# Test Wallet (Hardhat account #0)
TEST_WALLET_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
```

### Playwright Configuration

The `playwright.config.ts` file contains:

- Test directory location
- Timeout settings (5 minutes per test)
- Retry strategy (2 retries on CI)
- Reporter configuration (HTML + list)
- WebServer configuration (auto-starts dev server)

## ✍️ Writing Tests

### Basic Test Structure

```typescript
import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import { testWithSynpress } from '@synthetixio/synpress'
import connectedSetup from 'test/wallet-setup/connected.setup'

const test = testWithSynpress(metaMaskFixtures(connectedSetup))
const { expect, describe } = test

describe('Feature Name', () => {
  test('should do something', async ({ page, metamask }) => {
    // Navigate to page
    await page.goto('/')

    // Interact with app
    await page.click('[data-testid="button"]')

    // Interact with MetaMask if needed
    await metamask.connectToDapp()

    // Assert expected behavior
    await expect(page.locator('[data-testid="result"]')).toBeVisible()
  })
})
```

### Using MetaMask Fixture

The `metamask` fixture provides methods to interact with the MetaMask extension:

```typescript
// Connect wallet to dapp
await metamask.connectToDapp()

// Sign a message
await metamask.confirmSignature()

// Approve transaction
await metamask.confirmTransaction()

// Reject transaction
await metamask.rejectTransaction()

// Switch network
await metamask.switchNetwork('sepolia')

// Add custom network
await metamask.addNetwork({
  chainId: 31337,
  name: 'hardhat',
  rpcUrl: 'http://localhost:8545',
  symbol: 'ETH'
})

// Get wallet address
const address = await metamask.getAccountAddress()
```

## 🐛 Troubleshooting

### Cache Build Fails

**Issue**: `synpress --headless` command shows click interception errors

**Solution**: This is a known issue with MetaMask 11.9.1. As long as the `.cache-synpress` directory is created with the wallet setup hash folder, the cache is usable. The error occurs during cleanup, not during wallet setup.

### Tests Can't Find Cache

**Issue**: `Error: Cache for XXX does not exist. Create it first!`

**Solution**: Run `npm run test:build:cache:force` to rebuild the cache.

### Browser Not Found

**Issue**: `Executable doesn't exist at /home/runner/.cache/ms-playwright/chromium-XXXX`

**Solution**: Install Playwright browsers:

```bash
npx playwright install chromium --with-deps
```

### Version Mismatch Warnings

**Issue**: Warnings about Playwright version mismatch with Synpress

**Solution**: We're using Playwright 1.48.2 which is compatible with Synpress 4.0.3. Version warnings can be ignored as long as tests run successfully.

### Tests Timeout

**Issue**: Tests hang or timeout

**Solutions**:

1. Ensure the dev server is running if tests need it
2. Increase timeout in `playwright.config.ts`
3. Check if MetaMask interactions are waiting for user input
4. Use explicit waits: `await page.waitForSelector('[data-testid="element"]')`

### WebServer Fails to Start

**Issue**: Playwright can't start the dev server

**Solution**: Start the server manually in another terminal:

```bash
cd app
npm run dev
```

Then run tests with:

```bash
SKIP_SERVER=true npm run test:e2e
```

## 📊 Best Practices

1. **Use data-testid attributes** for stable selectors:

   ```vue
   <button data-testid="connect-wallet">Connect</button>
   ```

2. **Mock API calls** for consistent test data:

   ```typescript
   await page.route('**/api/teams', async (route) => {
     await route.fulfill({
       status: 200,
       body: JSON.stringify({ teams: mockTeams })
     })
   })
   ```

3. **Wait for network idle** after navigation:

   ```typescript
   await page.goto('/', { waitUntil: 'networkidle' })
   ```

4. **Use explicit waits** instead of arbitrary timeouts:

   ```typescript
   await page.waitForSelector('[data-testid="result"]', {
     state: 'visible',
     timeout: 30000
   })
   ```

5. **Clean up state** between tests if needed:

   ```typescript
   test.afterEach(async ({ page }) => {
     await page.evaluate(() => localStorage.clear())
   })
   ```

## 🔍 Debugging

### View Test Traces

After a test failure, view the trace:

```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Run Single Test

```bash
npx playwright test test/e2e/dashboard.spec.ts
```

### Run with Browser Visible

```bash
HEADLESS=false npx playwright test
```

### Generate Test Code

Use Playwright Codegen to generate test code by interacting with the app:

```bash
npx playwright codegen http://localhost:5173
```

## 📚 Resources

- [Synpress Documentation](https://synpress.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [MetaMask Test Dapp](https://metamask.github.io/test-dapp/)

## ⚠️ Known Issues

1. **Cache Build Errors**: The Synpress cache build may fail with click interception errors at the end. This is cosmetic - the cache is still created successfully.

2. **MetaMask Popover Interference**: MetaMask 11.9.1 has UI elements that can interfere with automated clicks during cache building. Tests themselves work fine.

3. **Headless Mode Required**: MetaMask extension works best in headless mode. Headed mode may have display issues on CI/CD.

## 🔐 Security Notes

- Never commit real private keys or seed phrases
- Use test wallets with test ETH only
- Test credentials are in `.env.e2e` (gitignored)
- Default test wallet is Hardhat account #0 (publicly known test account)
