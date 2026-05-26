# E2E Testing with Playwright

End-to-end (E2E) tests for the CNC Portal, using Playwright with an in-browser
**wagmi mock connector** to exercise Web3 wallet flows.

## Why a mock connector instead of MetaMask

Driving the real MetaMask extension (e.g. via Synpress) is slow and brittle:
extension selectors break on every MetaMask release, popup orchestration adds
30-60s per scenario, and CI becomes flaky.

Instead, when the app is started with `VITE_E2E=true`, `wagmi.config.ts`
registers `e2eMockConnector` (`src/e2e/mockConnector.ts`) — a connector that
wraps a viem local account (Hardhat test account #0). It handles `connect`,
`switchChain` and message signing **in-page**, so Playwright drives the UI
exactly like a real user, with no extension and no popups.

Message signing is done locally with the test private key, so the login
(SIWE) flow needs **no running chain**. Tests that submit real transactions
would still need a local Hardhat node at `http://localhost:8545`.

## Quick start

```bash
# Install dependencies and the Chromium browser
npm install
npx playwright install chromium

# Run the E2E suite (Playwright auto-starts the dev server in VITE_E2E mode)
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:headed   # headed browser, for debugging
npm run test:e2e:ui       # interactive Playwright UI
npm run test:e2e:debug    # step-through debugger
npm run test:e2e:report   # open the last HTML report
```

If you prefer to run the dev server yourself:

```bash
VITE_E2E=true VITE_APP_NETWORK_ALIAS=hardhat npm run dev   # terminal 1
SKIP_SERVER=true npm run test:e2e                          # terminal 2
```

## Layout

```text
test/
└── e2e/
    └── login.spec.ts   # SIWE login flow
```

The mock connector itself lives in `src/e2e/mockConnector.ts` and is wired in
`src/wagmi.config.ts`.

## Writing tests

Tests are plain Playwright — no special fixture. The wallet is already
available in-page via the mock connector, so you only drive the UI and stub
the backend:

```ts
import { test, expect } from '@playwright/test'

test('does something', async ({ page }) => {
  await page.route('**/api/teams**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ teams: [] })
    })
  )

  await page.goto('/')
  await page.getByTestId('sign-in').click()
  await expect(page).toHaveURL(/\/teams$/)
})
```

### Conventions

- Add stable `data-testid` attributes to interactive elements.
- Stub backend calls with `page.route` to keep tests hermetic.
- Prefer web-first assertions (`expect(locator).toBeVisible()`) and
  `page.waitForURL` over fixed `waitForTimeout` delays.

## Test wallet

The mock connector signs with Hardhat account #0:

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: a publicly known Hardhat test key — never used outside tests.

## Resources

- [Playwright documentation](https://playwright.dev/)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [wagmi mock connector](https://wagmi.sh/core/api/connectors/mock)
