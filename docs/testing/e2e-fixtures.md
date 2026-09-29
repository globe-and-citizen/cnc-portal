# Playwright E2E Fixture Catalogue

This catalogue defines which Playwright fixtures may prepare test state and which actions must remain visible product interactions. The
canonical business paths and their acceptance evidence remain in [Integrated E2E Checklist](./e2e-paths.md).

## Boundary rule

A fixture may prepare infrastructure, authentication, disposable actors, or domain state that is only a prerequisite of the journey under
test. It must not replace the product action that the scenario claims as acceptance evidence.

Examples:

- a Payroll payment test may receive an operational team and authenticated member because it proves claim approval and payment, not company
  onboarding or membership creation;
- the Company onboarding test must still create the team and deploy its Officer through the UI;
- an authentication test must still perform SIWE through the UI instead of requesting an already authenticated page;
- direct API or chain preparation is setup evidence only and must never be counted as a completed user journey.

## Shared fixture catalogue

The shared fixtures live in `app/test/e2e/fixtures.ts`.

| Fixture                                     | Scope                 | Responsibility                                                                                                | Cleanup                                                       |
| ------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `chainIsolation`                            | Every Playwright test | Snapshot the prepared local chain before the test                                                             | Restore the snapshot after the test, including after failures |
| `page`                                      | One test              | Stub external token prices and capture browser coverage                                                       | Write available coverage after the test                       |
| `authenticatedPage`                         | Opt-in                | Sign the default owner page into the real integrated backend                                                  | Reuse the default page lifecycle                              |
| `walletPage(privateKey)`                    | Opt-in factory        | Create and authenticate an additional isolated wallet page                                                    | Capture coverage and close every created context              |
| `operationalTeam(options)`                  | Opt-in factory        | Authenticate requested members and create a verified Officer-backed team through the real local API and chain | Delete every created team through the authenticated API       |
| `teamFeatureOverride(teamId, name, status)` | Opt-in factory        | Create or update a disposable team override through the real admin API                                        | Remove every requested override                               |

`authenticatedPage`, `operationalTeam`, and `teamFeatureOverride` are integrated-profile fixtures. They require the disposable backend and
database, and the owner test account must have the local administrator role. The CI workflow seeds that role before starting the backend.
For a local integrated run, seed the same role after migrating the disposable database:

```bash
cd backend
SEED_ADMINS=true \
ADMIN_ADDRESSES=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
ADMIN_ROLES=ROLE_ADMIN \
npm run seed:test
```

The feature-override fixture creates `SUBMIT_RESTRICTION` with its normal enabled status only when the disposable database does not contain
the setting. A scenario-specific override never weakens the global production default.

## Specialized setup retained by domain

Bank, Community Credit, Elections, Expense Account, and Safe browser-acceptance suites each deploy a narrow contract fixture in `beforeAll`.
Those deployments have different contract graphs and are intentionally not hidden behind one generic contract factory. The global
`chainIsolation` fixture now supplies their common per-test snapshot and restore behavior.

Stateful backend stubs remain in each mocked browser domain because their response models and failure branches are part of that domain's
test harness. Consolidating them into a generic response map would obscure the simulated boundary.

## Complete spec audit

| Spec                                                            | Profile        | Setup decision                                                                                                             |
| --------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `accounts.integrated.spec.ts`                                   | Integrated     | Uses `walletPage`; retains UI company and Safe wizard setup until Safe deployment has an independent workspace entry point |
| `authentication.integrated.spec.ts`                             | Integrated     | Performs SIWE through the UI because authentication is the behavior under test                                             |
| `bank/bank-account.spec.ts`                                     | Browser mocked | Retains its Bank contract graph; uses global chain isolation                                                               |
| `community-credit/community-credit-round.spec.ts`               | Browser mocked | Retains its Fixed Return graph; now carries the required browser and mocked execution tags                                 |
| `company/company-archive.spec.ts`                               | Browser mocked | Retains focused stateful API responses for archive failures and recovery                                                   |
| `company/company-delete.spec.ts`                                | Browser mocked | Retains focused deletion responses because deletion is the behavior under test                                             |
| `company/company-update.spec.ts`                                | Browser mocked | Retains focused metadata response variants                                                                                 |
| `company/company-visibility.spec.ts`                            | Browser mocked | Retains focused personal-visibility response variants                                                                      |
| `company/company.integrated.spec.ts`                            | Integrated     | Keeps onboarding and membership actions UI-driven; uses `walletPage` only to pre-authenticate the member actor             |
| `company/company.mocked.spec.ts`                                | Browser mocked | Keeps the mocked onboarding wizard and injected failure branches                                                           |
| `elections/elections.integrated.spec.ts`                        | Integrated     | Uses authenticated pages and an operational team; election creation, voting, and publication remain UI-driven              |
| `elections/elections.spec.ts`                                   | Browser mocked | Retains its Elections contract graph and API recorder; uses global chain isolation                                         |
| `expense/expense-account.spec.ts`                               | Browser mocked | Retains its Bank and Expense contract graph and API recorder; uses global chain isolation                                  |
| `investor-permissions.integrated.spec.ts`                       | Integrated     | Uses an authenticated owner page and operational team; role writes remain UI-driven                                        |
| `login.spec.ts`                                                 | Browser        | Performs the sign-in interaction because login is the behavior under test                                                  |
| `payroll/payroll-insufficient-funds.integrated.spec.ts`         | Integrated     | Uses an operational team, two wallet pages, and a disposable submit-restriction override                                   |
| `payroll/payroll-payment.integrated.spec.ts`                    | Integrated     | Uses an operational team, two wallet pages, and a disposable submit-restriction override                                   |
| `payroll/payroll.integrated.spec.ts`                            | Integrated     | Uses operational teams and authenticated wallet pages; keeps the default submission restriction                            |
| `safe/safe-account.spec.ts`                                     | Browser mocked | Retains its Safe graph and transaction-service recorder; uses global chain isolation                                       |
| `shareholder/shareholder-investment.integrated.spec.ts`         | Integrated     | Retains UI company and Safe setup because the Safe wizard is required by this path                                         |
| `shareholder/shareholder-issuance-dividends.integrated.spec.ts` | Integrated     | Uses an operational team and isolated member page; issuance, funding, Board approval, and distribution remain UI-driven    |
| `shareholder/shareholder-migration.integrated.spec.ts`          | Integrated     | Uses an operational team and isolated member page; redeployment, claims, settlement, and distribution remain UI-driven     |

## Failure diagnostics

Fixture prerequisites must fail before a long journey begins. Page helpers should assert that the next control is visible and enabled before
clicking it. For example, Payroll claim submission reports a disabled week within ten seconds instead of waiting for the complete test
timeout.

Do not increase a scenario timeout to hide an invalid fixture. Repair the prepared state or make the missing prerequisite explicit.
