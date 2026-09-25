# E2E Testing with Playwright

End-to-end (E2E) tests for the CNC Portal, using Playwright with an in-browser **wagmi mock connector** to exercise Web3 wallet flows.

## Why a mock connector instead of MetaMask

Driving the real MetaMask extension (e.g. via Synpress) is slow and brittle: extension selectors break on every MetaMask release, popup
orchestration adds 30-60s per scenario, and CI becomes flaky.

Instead, when the app is started with `VITE_E2E=true`, `wagmi.config.ts` registers `e2eMockConnector` (`src/e2e/mockConnector.ts`) — a
connector that wraps a viem local account (Hardhat test account #0). It handles `connect`, `switchChain` and message signing **in-page**, so
Playwright drives the UI exactly like a real user, with no extension and no popups.

Message signing is done locally with the test private key. Playwright never starts the frontend, backend, database, or Hardhat node. The
developer or CI must prepare the required stack before running a suite.

## Quick start

```bash
# Install dependencies and the Chromium browser
npm install
npx playwright install chromium

# Run the integrated suite against an already prepared stack
npm run test:e2e
```

Useful variants:

```bash
npm run test:e2e:headed   # headed browser, for debugging
npm run test:e2e:ui       # interactive Playwright UI
npm run test:e2e:debug    # step-through debugger
npm run test:e2e:report   # open the last HTML report
```

For browser acceptance, start the node, provision its deterministic fixtures once, and then start the frontend before Playwright. The setup
command is intentionally separate from the test runner so Playwright only exercises browser behaviour:

```bash
npm --prefix ../contract run node -- --port 8545 # terminal 1
npm run setup:e2e:browser # terminal 2, once the node is ready
VITE_E2E=true VITE_APP_NETWORK_ALIAS=hardhat \
  VITE_E2E_RPC_URL=http://127.0.0.1:8545 \
  VITE_E2E_USDC_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3 \
  VITE_E2E_USDCE_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512 npm run dev -- --port 5173 # terminal 2
BASE_URL=http://127.0.0.1:5173 npm run test:browser:acceptance # terminal 3
```

`npm run setup:e2e:browser` is idempotent for an already prepared browser-acceptance node. It fails on a partially provisioned or unexpected
chain instead of silently changing that state. The integrated profile has its own externally provisioned contracts, database, backend, and
frontend; it does not run this browser-fixture command. Its provisioning command is deliberately guarded by `E2E_INTEGRATED_SETUP=true` and
configures only its disposable database. In particular, it disables `SUBMIT_RESTRICTION` so Payroll can create a completed-week claim for
the real signature and withdrawal journey; it must never target a shared database.

## Layout

```text
test/
└── e2e/
    ├── fixtures.ts             # shared Playwright fixtures
    ├── login.spec.ts           # SIWE login flow
    └── bank/
        ├── bank-account.spec.ts # US-BANK-001..004 browser journeys
        ├── bank-chain.ts        # isolated Bank, Board, account, fee, and token deployment
        └── bank-page.ts         # Bank page, API, RPC, wallet, and cash-out test helpers
```

The mock connector itself lives in `src/e2e/mockConnector.ts` and is wired in `src/wagmi.config.ts`.

## Writing tests

Tests are plain Playwright. The wallet is available in-page via the mock connector, so tests drive the UI and stub the backend. For a
chain-backed journey, reset and deploy a narrow fixture through `test/e2e/bank/bank-chain.ts`; its first two deployments are intentionally
the USDC and USDCe addresses injected into the E2E Vite build above. The Bank suite snapshots and restores the chain around every test, and
runs serially because all scenarios share that deployment.

```ts
import { test, expect } from "@playwright/test";

test("does something", async ({ page }) => {
  await page.route("**/api/teams**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ teams: [] }),
    }),
  );

  await page.goto("/");
  await page.getByTestId("sign-in").click();
  await expect(page).toHaveURL(/\/teams$/);
});
```

### Conventions

- Add stable `data-testid` attributes to interactive elements.
- Stub backend calls with `page.route` to keep tests hermetic.
- Use the dedicated E2E node (`VITE_E2E_RPC_URL`), never a developer node, for transaction scenarios.
- Set `cnc-e2e-private-key` before page load to exercise another Hardhat account, or set `cnc-e2e-reject-next-transaction=true` to reject
  exactly the next wallet transaction.
- Prefer web-first assertions (`expect(locator).toBeVisible()`) and `page.waitForURL` over fixed `waitForTimeout` delays.

## Test wallet

The mock connector signs with Hardhat account #0:

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: a publicly known Hardhat test key — never used outside tests.

## Resources

- [Playwright documentation](https://playwright.dev/)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [wagmi mock connector](https://wagmi.sh/core/api/connectors/mock)
