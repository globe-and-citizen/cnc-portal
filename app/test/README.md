# E2E Testing with Playwright

End-to-end (E2E) tests for the CNC Portal, using Playwright with an in-browser **wagmi mock connector** to exercise Web3 wallet flows.

## Wallet model

When the app is started with `VITE_E2E=true`, `wagmi.config.ts` registers `e2eMockConnector` (`src/e2e/mockConnector.ts`) — a connector that
wraps a viem local account (Hardhat test account #0). It handles `connect`, `switchChain` and message signing in-page, so Playwright drives
the UI through the same product actions without requiring a browser extension or wallet popups.

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

CI runs `npm run preflight:e2e:integrated` after preparing the stack and before Playwright. For a local run, set `CNC_E2E_BACKEND_URL` to
the local backend origin and run the same preflight to check frontend reachability, database and chain readiness, and shared contract code.
The G0 browser test remains an independent diagnostic; the dedicated authentication test proves SIWE.

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
frontend; it does not run this browser-fixture command. Integrated tests that need an operational company may call the Node-side
`test/e2e/factories/operational-team.ts` before browser actions. Set `CNC_E2E_BACKEND_URL` to the local integrated backend origin; the
factory signs in with the public Hardhat owner account and any requested scenario-member accounts, creates the team with those authenticated
members through the real API, deploys its Officer generation on the dedicated local chain, registers that Officer through the API, and
verifies the returned team state. Pre-provision members only when membership itself is not the behaviour under test. The factory is setup
only: onboarding and membership-management tests still perform those product actions through the UI.

The shared Playwright fixture layer separates browser-only lifecycle from chain and integrated setup. Simulated scenarios use the base
browser lifecycle without touching Hardhat, while chain-backed and integrated scenarios add per-test snapshots. Integrated fixtures also
expose authenticated owner and secondary-wallet pages, tracked operational-team factories, disposable team feature overrides, and cleanup.
The complete ownership rules and spec audit are documented in the [E2E fixture catalogue](../../docs/testing/e2e-fixtures.md).

`npm run test:browser:acceptance` executes two phases and merges their Playwright blob reports into one HTML report:

- `@parallel-safe` scenarios run file-level parallelism with three workers;
- the remaining `@browser` scenarios use the shared local chain and remain on one worker.

The `@parallel-safe` tag describes isolation, not whether a scenario is mocked. Some `@mocked` browser scenarios still deploy contracts and
must remain in the chain-backed phase.

## Layout

```text
test/
└── e2e/
    ├── fixtures/
    │   ├── base.ts                          # browser lifecycle, price stub, and coverage
    │   ├── mocked.ts                        # parallel-safe simulated scenarios
    │   ├── chain.ts                         # per-test Hardhat snapshot and restore
    │   └── integrated.ts                    # authenticated pages, factories, and cleanup
    ├── factories/
    │   ├── operational-team.ts              # authenticated team and Officer setup
    │   └── operational-team-deployment.ts   # Officer deployment configuration
    ├── integrated-api.ts                    # local-only SIWE and authenticated setup requests
    ├── login.spec.ts                        # SIWE login flow
    └── bank/
        ├── bank-account.spec.ts # US-BANK-001..004 browser journeys
        ├── bank-chain.ts        # isolated Bank, Board, account, fee, and token deployment
        └── bank-page.ts         # Bank page, API, RPC, wallet, and cash-out test helpers
```

The mock connector itself lives in `src/e2e/mockConnector.ts` and is wired in `src/wagmi.config.ts`.

## Writing tests

Tests are plain Playwright. The wallet is available in-page via the mock connector, so tests drive the UI and stub the backend. For a
chain-backed browser journey, deploy a narrow domain fixture such as `test/e2e/bank/bank-chain.ts`; its first two deployments are
intentionally the USDC and USDCe addresses injected into the E2E Vite build above. Import `fixtures/chain` so the prepared chain is restored
around every test. A scenario whose owned backend and chain boundaries are fully simulated imports `fixtures/mocked` and may carry
`@parallel-safe`. Domain suites with one shared deployment remain serial.

```ts
import { test, expect } from "./fixtures/mocked";

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
- Add `@parallel-safe` only when a scenario performs no RPC read, contract deployment, or chain write and owns no shared mutable backend
  state.
- Stub backend calls with `page.route` to keep tests hermetic.
- Use the dedicated E2E node (`VITE_E2E_RPC_URL`), never a developer node, for transaction scenarios.
- Set `cnc-e2e-private-key` before page load to exercise another Hardhat account, or set `cnc-e2e-reject-next-transaction=true` to reject
  exactly the next wallet transaction.
- Prefer web-first assertions (`expect(locator).toBeVisible()`) and `page.waitForURL` over fixed `waitForTimeout` delays.
- Use `authenticatedPage`, `walletPage`, `operationalTeam`, and `teamFeatureOverride` only for prerequisites outside the journey's own
  acceptance evidence.

## Test wallet

The mock connector signs with Hardhat account #0:

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: a publicly known Hardhat test key — never used outside tests.

## Resources

- [Playwright documentation](https://playwright.dev/)
- [Playwright best practices](https://playwright.dev/docs/best-practices)
- [wagmi mock connector](https://wagmi.sh/core/api/connectors/mock)
