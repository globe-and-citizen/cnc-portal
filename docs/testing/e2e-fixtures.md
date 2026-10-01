# Playwright E2E Fixture Catalogue

**Last reviewed:** 2026-09-30

This catalogue defines which Playwright fixtures may prepare test state and which actions must remain visible product interactions. The
canonical business paths and their acceptance evidence remain in [Integrated E2E Checklist](./e2e-paths.md).

## Boundary rule

A fixture may prepare infrastructure, authentication, disposable actors, or domain state that is only a prerequisite of the journey under
test. It must not replace the product action that the scenario claims as acceptance evidence. Each integrated test owns its own state: chain
snapshots are restored and factory-created teams are deleted after the test. A path may require an outcome described by another path, but it
cannot consume that other test's company or transactions.

Examples:

- a Payroll payment test may receive an operational team and authenticated member because it proves claim approval and payment, not company
  onboarding or membership creation;
- the Company onboarding test must still create the team and deploy its Officer through the UI;
- an authentication test must still perform SIWE through the UI instead of requesting an already authenticated page;
- direct API or chain preparation is setup evidence only and must never be counted as a completed user journey.

## Directory ownership

Reusable E2E setup is grouped by responsibility:

- `app/test/e2e/fixtures/` owns Playwright lifecycle, automatic isolation, tracked resources, and cleanup;
- `app/test/e2e/factories/` owns reusable creation of prerequisite business state through real local boundaries;
- each domain directory retains its own `*-page.ts` and `*-chain.ts` helpers because those helpers encode domain-specific UI and contract
  graphs;
- root-level E2E support modules are reserved for low-level helpers shared by fixtures, factories, and multiple domains.

A factory creates state. A fixture controls when that state is made available and guarantees cleanup. Domain actions must not be moved into
a shared fixture merely to shorten a scenario.

## Shared fixture catalogue

The fixture entry points are split by boundary so a simulated browser test does not acquire a Hardhat dependency it never uses:

- `app/test/e2e/fixtures/base.ts` owns the browser page, deterministic external token prices, and coverage capture;
- `app/test/e2e/fixtures/mocked.ts` re-exports the base lifecycle for fully simulated scenarios;
- `app/test/e2e/fixtures/chain.ts` adds the local-chain snapshot and restore lifecycle;
- `app/test/e2e/fixtures/integrated.ts` adds authenticated pages, tracked factories, and cleanup on top of chain isolation.

Integrated operational-team creation lives in `app/test/e2e/factories/operational-team.ts`.

| Fixture                                     | Scope                      | Responsibility                                                                                                | Cleanup                                                       |
| ------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `page`                                      | Every Playwright test      | Stub external token prices and capture browser coverage                                                       | Write available coverage after the test                       |
| `chainIsolation`                            | Chain and integrated tests | Snapshot the prepared local chain before the test                                                             | Restore the snapshot after the test, including after failures |
| `authenticatedPage`                         | Integrated opt-in          | Sign the default owner page into the real integrated backend                                                  | Reuse the default page lifecycle                              |
| `walletPage(privateKey)`                    | Integrated opt-in factory  | Create and authenticate an additional isolated wallet page                                                    | Capture coverage and close every created context              |
| `operationalTeam(options)`                  | Integrated opt-in factory  | Authenticate requested members and create a verified Officer-backed team through the real local API and chain | Delete every created team through the authenticated API       |
| `teamFeatureOverride(teamId, name, status)` | Integrated opt-in factory  | Create or update a disposable team override through the real admin API                                        | Remove every requested override                               |

`authenticatedPage`, `operationalTeam`, and `teamFeatureOverride` are integrated-profile fixtures. They require the disposable backend and
database. The dedicated E2E seed creates the deterministic owner, member, and secondary signer; only the owner receives the local
administrator role. It does not create teams, wages, claims, or other scenario state. The CI workflow runs this seed before starting the
backend. For a local integrated run, run the same command after migrating the disposable database:

```bash
cd backend
npm run seed:e2e
```

The feature-override fixture creates `SUBMIT_RESTRICTION` with its normal enabled status only when the disposable database does not contain
the setting. A scenario-specific override never weakens the global production default.

## Specialized setup retained by domain

Bank, Community Credit, Elections, Expense Account, and Safe browser-acceptance suites each deploy a narrow contract fixture in `beforeAll`.
Those deployments have different contract graphs and are intentionally not hidden behind one generic contract factory. Their chain fixture
supplies common per-test snapshot and restore behavior, and they remain on one worker because their deployments share one local node.

Stateful backend stubs remain in each mocked browser domain because their response models and failure branches are part of that domain's
test harness. Consolidating them into a generic response map would obscure the simulated boundary.

The `@parallel-safe` execution tag is reserved for scenarios that import `fixtures/mocked`, perform no RPC read, contract deployment, or
chain write, and own no shared mutable backend state. Those files run on three workers. `@mocked` only says that a product boundary is
replaced; it does not imply that all boundaries are simulated, so it is not a worker-selection tag.

## Complete spec audit

| Spec                                                            | Profile        | Setup decision                                                                                                          |
| --------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `accounts.integrated.spec.ts`                                   | Integrated     | Skips optional Safe setup for the Bank path; Bank deposits, transfers, and Expense Account actions stay UI-driven       |
| `authentication.integrated.spec.ts`                             | Integrated     | Performs SIWE through the UI and compares the browser wallet's chain with the backend chain                             |
| `bank/bank-account.spec.ts`                                     | Browser chain  | Retains its Bank contract graph and serial chain isolation                                                              |
| `community-credit/community-credit-round.spec.ts`               | Browser chain  | Retains its Fixed Return graph and serial chain isolation                                                               |
| `company/company-archive.spec.ts`                               | Browser mocked | Retains focused stateful API responses; parallel-safe                                                                   |
| `company/company-delete.spec.ts`                                | Browser mocked | Retains focused deletion responses; parallel-safe                                                                       |
| `company/company-update.spec.ts`                                | Browser mocked | Retains focused metadata response variants; parallel-safe                                                               |
| `company/company-visibility.spec.ts`                            | Browser mocked | Retains focused personal-visibility response variants; parallel-safe                                                    |
| `company/company.integrated.spec.ts`                            | Integrated     | Keeps onboarding and membership actions UI-driven; uses `walletPage` only to pre-authenticate the member actor          |
| `company/company.mocked.spec.ts`                                | Browser mocked | Keeps the mocked onboarding wizard and injected failure branches; parallel-safe                                         |
| `elections/elections.integrated.spec.ts`                        | Integrated     | Uses authenticated pages and an operational team; election creation, voting, and publication remain UI-driven           |
| `elections/elections.spec.ts`                                   | Browser chain  | Retains its Elections contract graph, API recorder, and serial chain isolation                                          |
| `expense/expense-account.spec.ts`                               | Browser chain  | Retains its Bank and Expense contract graph, API recorder, and serial chain isolation                                   |
| `investor-permissions.integrated.spec.ts`                       | Integrated     | Uses an authenticated owner page and operational team; role writes remain UI-driven                                     |
| `login.spec.ts`                                                 | Browser mocked | Performs the simulated sign-in interaction; parallel-safe                                                               |
| `payroll/payroll-insufficient-funds.integrated.spec.ts`         | Integrated     | Uses an operational team, two wallet pages, and a disposable submit-restriction override                                |
| `payroll/payroll-payment.integrated.spec.ts`                    | Integrated     | Uses an operational team, two wallet pages, and a disposable submit-restriction override                                |
| `payroll/payroll.integrated.spec.ts`                            | Integrated     | Uses operational teams and authenticated wallet pages; keeps the default submission restriction                         |
| `safe/safe-account.spec.ts`                                     | Browser chain  | Retains its Safe graph, transaction-service recorder, and serial chain isolation                                        |
| `safe/safe-setup.integrated.spec.ts`                            | Integrated     | Deploys and registers a Safe through the UI; the transaction-service response is stubbed for the account view           |
| `shareholder/shareholder-investment.integrated.spec.ts`         | Integrated     | Retains UI company and Safe setup because the Safe wizard is required by this path                                      |
| `shareholder/shareholder-issuance-dividends.integrated.spec.ts` | Integrated     | Uses an operational team and isolated member page; issuance, funding, Board approval, and distribution remain UI-driven |
| `shareholder/shareholder-migration.integrated.spec.ts`          | Integrated     | Uses an operational team and isolated member page; redeployment, claims, settlement, and distribution remain UI-driven  |

## Failure diagnostics

Fixture prerequisites must fail before a long journey begins. Page helpers should assert that the next control is visible and enabled before
clicking it. Community Credit lending verifies the current modal, amount, and enabled confirmation control before submitting. Payroll wage
setup first opens the owning Payroll workspace and verifies the members table, while claim submission reports a disabled week within ten
seconds and confirms the persisted memo instead of relying on a potentially duplicated toast. A secondary wallet session that consumes a
newly created notification must be opened after the notification is persisted so its query cache cannot retain pre-scenario data. Navigation
from an overlay must also dismiss that overlay before the next covered action when it remains mounted across the SPA route change.

Do not increase a scenario timeout to hide an invalid fixture. Repair the prepared state or make the missing prerequisite explicit.
