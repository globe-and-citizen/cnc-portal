# E2E Readiness and Business Paths

**Scope:** G0 technical readiness gate and G1 through G8 business-path evidence

**Status model:** `Planned` means no integrated path is currently linked; `Integrated partial` means the main journey exists but one or more
observable outcomes remain uncovered; `Integrated covered` means the linked main journey exercises the documented outcome through the real
frontend, backend, database, and chain; `Browser variants` identifies focused browser-acceptance evidence that is not integrated evidence.

This document records the current evidence shape. It does not claim that the latest local or CI execution passed; read the Playwright report
and protected CI checks for execution results.

This checklist organizes integrated E2E coverage around business paths rather than one path per user story. A path may validate several
stories when the same actors, persisted state, and UX sequence connect them naturally. G0 is a technical gate, not a business path or a
Playwright test.

The canonical product outcomes remain in the linked feature documentation. Story and acceptance-criterion references below define intended
coverage; the latest execution result and artifacts belong in Playwright and CI reports.

## Path Model

- G0 is checked before Playwright; it does not validate a user story and is not counted as E2E path coverage.
- One path represents one coherent business objective from an actor's point of view.
- The main success sequence should run as one browser test when later actions consume state created by earlier actions.
- Validation, authorization, recovery, and injected-failure branches remain separate tests attached to the same path.
- A story is validated only when the path performs its observable action and verifies the resulting backend, database, or chain state.
- Seeded or API-created state is a dependency, not evidence that the story creating that state passed.
- Keep a destructive terminal action in its own path when it would prevent subsequent checks or make failures harder to diagnose.

## Group Catalogue

- G0 — Shared technical readiness gate, outside the business-path inventory.
- G1 — Company onboarding and treasury readiness.
- G2 — Company administration and member access.
- G3 — Shareholder lifecycle and SHER.
- G4 — Community Credit lifecycle.
- G5 — Payroll lifecycle.
- G6 — Expense Account lifecycle.
- G7 — Cross-feature Accounting verification.
- G8 — Board Election lifecycle.

## Current status snapshot

G0 is represented separately because its automated preflight is an execution prerequisite, not an integrated user journey:

| Group | Kind           | Mechanism                                                                                  | Status                               |
| ----- | -------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ |
| G0    | Technical gate | [Integrated preflight](../../app/scripts/check-integrated-readiness.mjs) before Playwright | Automated; see CI run for the result |

The business-path snapshot is path-level. Its status is derived from the checklist below, not from the result of the latest local or CI
execution:

- `✅ Covered` means that every current path-checklist assertion is `[x]` and an integrated evidence file is linked.
- `🟡 Partial` means that integrated evidence is linked but one or more current path-checklist assertions remain `[ ]`.
- `⬜ Planned` means that no integrated business path is currently linked.

| Group | Path          | Evidence inventory | Status     |
| ----- | ------------- | ------------------ | ---------- |
| G1    | `E2E-PATH-01` | `21/21`            | ✅ Covered |
| G1    | `E2E-PATH-02` | `7/9`              | 🟡 Partial |
| G2    | `E2E-PATH-03` | `7/9`              | 🟡 Partial |
| G2    | `E2E-PATH-04` | `5/10`             | 🟡 Partial |
| G2    | `E2E-PATH-05` | `4/6`              | 🟡 Partial |
| G3    | `E2E-PATH-06` | `26/26`            | ✅ Covered |
| G3    | `E2E-PATH-07` | `35/35`            | ✅ Covered |
| G3    | `E2E-PATH-08` | `15/15`            | ✅ Covered |
| G4    | `E2E-PATH-09` | `0/9`              | ⬜ Planned |
| G4    | `E2E-PATH-10` | `0/5`              | ⬜ Planned |
| G5    | `E2E-PATH-11` | `9/9`              | ✅ Covered |
| G5    | `E2E-PATH-12` | `8/8`              | ✅ Covered |
| G5    | `E2E-PATH-13` | `20/22`            | 🟡 Partial |
| G6    | `E2E-PATH-14` | `9/15`             | 🟡 Partial |
| G7    | `E2E-PATH-15` | `0/10`             | ⬜ Planned |
| G7    | `E2E-PATH-16` | `0/7`              | ⬜ Planned |
| G8    | `E2E-PATH-17` | `23/23`            | ✅ Covered |

The detailed path sections below own the remaining work for each row. `Evidence inventory` counts the current checklist assertions, not test
cases or passing executions. A `✅ Covered` path does not imply that every acceptance criterion of its linked user stories is complete; the
canonical feature README remains the authority for AC-level status. The generated acceptance-coverage reports remain a static inventory and
must not be used as a last-run status board.

The `[x]` and `[ ]` markers in the detailed checklists are an evidence inventory: `[x]` means that the linked test directly proves the line,
while `[ ]` means that the direct evidence is still missing. They are not a latest-run result. Use the `Status` line for the coverage
classification and the linked Playwright or CI report for the result of a particular execution.

Each product step is prefixed with its canonical `US-*` user-story anchor. We use the user story at path level because one journey step can
prove several acceptance criteria; the precise `AC-*` mapping remains canonical in the linked feature README and the representative test's
`Covers` block.

## Integration Boundary

- Real boundaries:
  - browser and production frontend code;
  - SIWE authentication and backend authorization;
  - backend routes and controllers;
  - migrated PostgreSQL database;
  - local chain, deployed contracts, transactions, receipts, events, and refreshed reads.
- Simulated boundaries:
  - external services not owned by CNC Portal, such as token-price providers.
- Runtime ownership:
  - locally, the developer starts and controls the frontend, backend, database, and node;
  - in CI, the workflow prepares those services before Playwright starts;
  - browser-acceptance fixtures are provisioned explicitly with `npm run setup:e2e:browser`, outside Playwright;
  - integrated infrastructure is deployed by the developer or CI stack, also before Playwright starts;
  - an integrated scenario may call a Node-side team factory before its browser actions to create isolated domain data through the real
    backend API and dedicated local chain;
  - the CI preflight checks the prepared frontend, backend dependencies, local chain, and shared Officer/Bank/token contracts before
    Playwright; the integrated authentication test additionally compares the browser wallet's chain with the backend chain.
- Fixture-preparation rule:
  - a team factory prepares only scenario data (team, Officer generation, and its managed contracts), not shared chain infrastructure;
  - factory calls are setup and do not count as product-flow evidence; the scenario still drives the behaviour under test through the UI;
  - the factory must authenticate with the test wallet, restrict writes to the disposable local backend and chain, and return verified
    backend and chain state;
  - the chain and integrated Playwright layers snapshot and restore the prepared chain around every applicable test; the integrated layer
    also tracks additional wallet contexts and deletes every team or team-feature override created through its factories;
  - authentication, onboarding, membership, or configuration fixtures are prohibited when that action is the acceptance evidence owned by
    the current path; the complete decisions are recorded in the [fixture catalogue](./e2e-fixtures.md);
- Browser-action rule:
  - Playwright may submit a contract transaction only through a user-accessible product action;
  - browser code must not deploy fixtures, alter contract code or balances, control mining, or mutate chain state directly through RPC
    methods; the Node-side team factory is the narrow setup-only exception for integrated scenarios that do not test onboarding.
- Execution profiles:
  - `@integrated` paths use the developer- or CI-managed frontend, backend, database, and local chain without intercepting CNC Portal
    boundaries;
  - `@browser` scenarios may inject backend state, direct fixture setup, wallet failures, or network outcomes and do not count as integrated
    E2E evidence;
  - `@mocked` is the narrower marker for browser scenarios that explicitly replace a product boundary;
  - `@parallel-safe` marks browser scenarios whose owned backend and chain boundaries are fully simulated; it is independent of `@mocked`
    because some mocked scenarios still use real local contracts;
  - run every migrated integrated path with `npm run test:e2e` from `app/`;
  - run browser acceptance with `npm run test:browser:acceptance` from `app/`;
  - both commands only select Playwright tests; neither provisions services, contracts, or fixtures;
  - the developer or CI prepares the selected profile before invoking either command.
- CI ownership:
  - independent `Browser acceptance` and `Integrated journeys` jobs run in parallel on isolated local chains and publish separate reports;
  - the browser job provisions browser fixtures outside Playwright, runs parallel-safe files on three workers, runs chain-backed files on
    one worker, merges both reports, and owns a 25-minute budget;
  - the integrated job provisions a disposable PostgreSQL database, applies migrations, seeds the deterministic E2E actors, deploys its
    chain infrastructure, verifies technical readiness, and owns a 60-minute budget;
  - a lightweight `Full-stack E2E` aggregator preserves the protected check name and passes only when both profile jobs succeed;
  - integrated paths may use the Node-side team factory for scenario setup, while Playwright performs the product actions being tested; CI
    retains reports plus failure traces and stack logs as evidence.

## G0 — Shared Technical Readiness Gate

G0 runs through `npm run preflight:e2e:integrated` after the stack is prepared and before integrated Playwright journeys. It has no
`E2E-PATH-00`, user story, acceptance-criterion coverage ratio, or dedicated Playwright test. Its implementation is the
[preflight script](../../app/scripts/check-integrated-readiness.mjs), invoked by the [E2E workflow](../../.github/workflows/app-e2e.yml) and
covered by [focused Node tests](../../app/scripts/__tests__/check-integrated-readiness.node.mjs).

The gate checks frontend reachability; backend readiness for its database and configured chain; direct local RPC chain identity; and
deployed code at the shared Officer factory beacon, Bank beacon, USDC, USDCe, and USDT manifest addresses. A passing gate means only that
these shared prerequisites were ready for that run. The browser wallet/backend chain comparison belongs to the
[integrated authentication test](../../app/test/e2e/authentication.integrated.spec.ts); feature-specific infrastructure, including Safe,
belongs to its own scenarios. Neither check turns G0 into product-flow evidence.

## G1 — Company Onboarding and Treasury Readiness

- `E2E-PATH-01` — Create, deploy, and reopen an operational company
  - Stories validated:
    - `US-COMPANIES-001` — create a company workspace;
    - `US-COMPANIES-002` — deploy the initial Officer suite;
    - `US-COMPANIES-003` — browse and open the company.
  - Actors: company creator and owner; the owner also satisfies the member role for the list journey.
  - Dependencies: G0 technical preflight and predeployed Officer infrastructure.
  - Main path:
    - [x] `US-AUTH-001` Sign in through SIWE.
    - [x] `US-COMPANIES-001` Enter company metadata.
    - [x] `US-COMPANIES-001` Submit the company through the real backend.
    - [x] `US-COMPANIES-001` Verify that the company persisted.
    - [x] `US-COMPANIES-001` Verify that the owner and creator membership persisted.
    - [x] `US-COMPANIES-002` Enter the SHER name.
    - [x] `US-COMPANIES-002` Enter the SHER symbol.
    - [x] `US-COMPANIES-002` Submit a real Officer deployment transaction.
    - [x] `US-COMPANIES-002` Verify the Officer deployment receipt on-chain.
    - [x] `US-COMPANIES-002` Verify the Officer contract on-chain.
    - [x] `US-COMPANIES-002` Verify the child contracts on-chain.
    - [x] `US-COMPANIES-002` Verify the Investor metadata on-chain.
    - [x] `US-COMPANIES-002` Verify the backend registered the Officer address.
    - [x] `US-COMPANIES-002` Verify the backend persisted the deployment metadata.
    - [x] `US-COMPANIES-003` Continue past the optional Safe step.
    - [x] `US-COMPANIES-003` Find the company in the Companies list.
    - [x] `US-COMPANIES-003` Reopen the company workspace.
    - [x] `US-COMPANIES-003` Verify its metadata.
    - [x] `US-COMPANIES-003` Verify its members.
    - [x] `US-COMPANIES-003` Verify its lifecycle state.
    - [x] `US-COMPANIES-003` Verify its feature navigation.
  - Separate variants:
    - required-field and member-address validation;
    - wallet rejection or reverted deployment;
    - failed Officer registration after a successful transaction;
    - non-owner member access and unavailable workspace states.
  - Expected result: the same persisted company moves from creation to a contract-backed workspace and remains recoverable from the list.
  - Status: Integrated covered — the main onboarding path is executable; required-field, member-address, failed-create, and wallet-rejection
    variants use browser boundaries.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked browser variants](../../app/test/e2e/company/company.mocked.spec.ts).

- `E2E-PATH-02` — Fund the company Bank
  - Stories validated:
    - `US-BANK-001` — fund the company Bank.
    - `US-BANK-003` — review the Bank position and history; post-reload assertions remain open in this path.
  - Actors: company owner.
  - Dependencies: an operational company from `E2E-PATH-01` and funded local wallets.
  - Main path:
    - [x] `US-BANK-001` Open the current Bank from the same company.
    - [x] `US-BANK-001` Deposit the native token through the UI.
    - [x] `US-BANK-001` Verify the native-token deposit receipt.
    - [x] `US-BANK-001` Verify the native-token balance change.
    - [x] `US-BANK-001` Deposit a supported ERC-20 token through the UI.
    - [x] `US-BANK-001` Verify the ERC-20 deposit receipt.
    - [x] `US-BANK-001` Verify the ERC-20 balance change.
    - [ ] `US-BANK-003` Reload and verify that the Bank balances remain available.
    - [ ] `US-BANK-003` Reload and verify that the Bank history remains available.
  - Deferred scope: the complete Safe US/AC journey is outside this path. Separate Safe tests continue to prove the scenarios that are
    currently executable, while incomplete Safe coverage must not gate this Bank path or count in its coverage ratio.
  - Separate variants: rejected wallet requests and failed deposits remain browser acceptance coverage.
  - Expected result: the company has a funded Bank backed by durable chain evidence; Safe readiness is handled separately.
  - Status: Integrated partial — Bank deposits, balances, and in-flow history run through the integrated stack, while post-reload Bank
    persistence remains to be proven. Safe coverage is tracked independently and does not gate this path.
  - Evidence: [integrated Accounts test](../../app/test/e2e/accounts.integrated.spec.ts) for the Bank assertions; its separate Safe
    assertions are not prerequisites for this path and remain tracked outside its coverage ratio.

## G2 — Company Administration and Member Access

- `E2E-PATH-03` — Maintain company identity and membership
  - Stories validated:
    - `US-COMPANIES-004` — update company details;
    - `US-COMPANIES-005` — manage company members.
  - Actors: company owner and invited member.
  - Dependencies: a persisted company from G1 and a second authenticated portal user.
  - Main path:
    - [x] `US-COMPANIES-004` Update the company name.
    - [x] `US-COMPANIES-004` Update the company description.
    - [x] `US-COMPANIES-004` Verify the updated identity persists in the workspace.
    - [x] `US-COMPANIES-004` Verify the updated identity persists in the Companies list.
    - [x] `US-COMPANIES-005` Add the second user as a member.
    - [ ] `US-COMPANIES-003` Sign in as that member and verify workspace access.
    - [x] `US-COMPANIES-005` Remove the member.
    - [x] `US-COMPANIES-005` Verify that the membership-row change persists.
    - [ ] `US-COMPANIES-005` Verify that the removed member can no longer access the workspace.
  - Separate variants: invalid metadata, existing members, owner removal, non-owner writes, archived-company writes, and rejected requests.
  - Expected result: company identity and membership remain consistent for both actors.
  - Status: Integrated partial — metadata and membership mutations share one integrated path, while second-user access and revocation remain
    planned.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked update variants](../../app/test/e2e/company/company-update.spec.ts).

- `E2E-PATH-04` — Suspend and recover company access
  - Stories validated:
    - `US-COMPANIES-007` — control personal company-list visibility;
    - `US-COMPANIES-006` — archive or restore a company.
  - Actors: company member and company owner.
  - Dependencies: a persisted company with both actors from `E2E-PATH-03`.
  - Main path:
    - [ ] `US-COMPANIES-007` Hide the company from the member's own list.
    - [ ] `US-COMPANIES-007` Recover the company in the member's own list.
    - [ ] `US-COMPANIES-007` Verify the owner's list is unaffected by the member's visibility preference.
    - [x] `US-COMPANIES-006` Archive the company as owner.
    - [x] `US-COMPANIES-006` Verify the company is excluded from the default list.
    - [x] `US-COMPANIES-006` Recover the company from the archived list.
    - [ ] `US-COMPANIES-006` Verify company writes are frozen while the company is archived.
    - [ ] `US-COMPANIES-007` Verify personal visibility remains changeable while the company is archived.
    - [x] `US-COMPANIES-006` Restore the company.
    - [x] `US-COMPANIES-006` Verify that normal company actions return after restoration.
  - Separate variants: non-member visibility changes, non-owner lifecycle changes, and rejected archived writes.
  - Expected result: personal visibility and company lifecycle remain distinct and recoverable.
  - Status: Integrated partial — archive/restore and hide/show share one integrated path, while cross-wallet isolation, archived-write
    rejection, and visibility-change proof remain planned.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts),
    [mocked lifecycle variants](../../app/test/e2e/company/company-archive.spec.ts), and
    [mocked visibility variants](../../app/test/e2e/company/company-visibility.spec.ts).

- `E2E-PATH-05` — Permanently retire a company
  - Story validated: `US-COMPANIES-008` — permanently delete a company.
  - Reason for isolation: deletion is terminal and would destroy the shared state needed by other G2 paths.
  - Actor: company owner.
  - Dependencies: a disposable company whose preceding lifecycle evidence has already been collected.
  - Main path:
    - [x] `US-COMPANIES-008` Cancel once.
    - [x] `US-COMPANIES-008` Verify the company remains available after cancellation.
    - [x] `US-COMPANIES-008` Confirm permanent deletion.
    - [x] `US-COMPANIES-008` Verify the Companies list is restored after deletion.
    - [ ] `US-COMPANIES-008` Verify the company endpoint returns unavailable.
    - [ ] `US-COMPANIES-008` Verify related records are removed.
  - Separate variants: non-owner and rejected deletion.
  - Expected result: the deleted workspace cannot be reopened or restored.
  - Status: Integrated partial — cancellation and permanent removal pass, while cascade evidence remains to be added.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked deletion variants](../../app/test/e2e/company/company-delete.spec.ts).

## G3 — Shareholder Lifecycle and SHER

- `E2E-PATH-06` — Configure investment, invest, and review the shareholder position
  - Stories validated:
    - `US-SHER-005` — configure shareholder investment;
    - `US-SHER-001` — invest in the Safe and receive SHER;
    - `US-SHER-003` — review shareholder position and activity.
  - Actors: company owner as router owner and investor.
  - Dependencies: an operational company, a Safe deployed through the portal, current Investor and Safe Deposit Router contracts, and a
    funded local wallet.
  - Main path:
    - [x] `US-COMPANIES-001` Create an operational company through the real portal and backend.
    - [x] `US-SAFE-001` Deploy the company's Safe through the real portal and backend.
    - [x] `US-SHER-005` Synchronize the router with the registered Safe.
    - [x] `US-SHER-005` Set a `2x` investment multiplier.
    - [x] `US-SHER-005` Enable deposits through owner browser writes.
    - [x] `US-SHER-005` Verify the investment configuration on-chain.
    - [x] `US-SHER-005` Verify that investment stays unavailable before Safe synchronization is complete.
    - [x] `US-SHER-001` Approve the required ERC-20 allowance through the browser.
    - [x] `US-SHER-001` Invest USDC through the browser.
    - [x] `US-SHER-001` Verify the Safe receipt.
    - [x] `US-SHER-001` Verify the router deposit event.
    - [x] `US-SHER-001` Verify SHER issuance.
    - [x] `US-SHER-001` Verify the total supply.
    - [x] `US-SHER-001` Verify the shareholder register on-chain.
    - [x] `US-SHER-003` Reload and verify the Investor symbol.
    - [x] `US-SHER-003` Reload and verify the investor wallet balance.
    - [x] `US-SHER-003` Reload and verify the total supply.
    - [x] `US-SHER-003` Reload and verify the shareholder count.
    - [x] `US-SHER-003` Reload and verify the shareholder address.
    - [x] `US-SHER-003` Reload and verify the shareholder balance.
    - [x] `US-SHER-003` Reload and verify the ownership percentage.
    - [x] `US-SHER-003` Reload and verify the investment configuration.
    - [x] `US-SHER-003` Reload and verify investment activity.
    - [x] `US-SHER-003` Filter the activity by type.
    - [x] `US-SHER-003` Filter the activity by date.
    - [x] `US-SHER-003` Open a concrete transaction detail.
  - Separate variants: disabled or paused deposits, amount and dependency validation, rejected approval, failed deposit, cancellation,
    unauthorized configuration, archived-company writes, and failed reads remain focused frontend or contract tests where representative
    evidence is linked.
  - Expected result: the investment configuration produces a durable shareholder position.
  - Status: Integrated covered — the production frontend, owned backend, disposable database, and local chain run together. Controlled
    validation, permission, and recovery variants remain focused layer tests.
  - Evidence: [integrated shareholder investment lifecycle](../../app/test/e2e/shareholder/shareholder-investment.integrated.spec.ts).

- `E2E-PATH-07` — Issue SHER, distribute dividends, and review the result
  - Stories validated:
    - `US-SHER-004` — issue SHER to a shareholder;
    - `US-SHER-002` — distribute dividends.
  - Reused verification: the shareholder position and activity from `US-SHER-003` are read again, while primary ownership remains in
    `E2E-PATH-06`.
  - Dependencies: an operational company, eligible issuer, funded Bank, and at least one shareholder.
  - Main path:
    - [x] `US-COMPANIES-001` Create an operational company with the required authenticated members.
    - [x] `US-SHER-004` Issue `30 E2E` to the owner through browser writes.
    - [x] `US-SHER-004` Issue `10 E2E` to one member through browser writes.
    - [x] `US-SHER-004` Verify the owner's successful issuance receipt.
    - [x] `US-SHER-004` Verify the member's successful issuance receipt.
    - [x] `US-SHER-004` Verify the `Minted` events.
    - [x] `US-SHER-004` Verify the `40 E2E` total supply.
    - [x] `US-SHER-004` Verify the two-address shareholder register on-chain.
    - [x] `US-SHER-002` Fund the Bank with `4 USDC` through the portal.
    - [x] `US-SHER-002` Distribute the held balance through the direct owner authorization path.
    - [x] `US-SHER-002` Verify the Bank distribution event.
    - [x] `US-SHER-002` Verify the Investor distribution event.
    - [x] `US-SHER-002` Verify the owner's proportional payment of `3 USDC`.
    - [x] `US-SHER-002` Verify the member's proportional payment of `1 USDC`.
    - [x] `US-SHER-002` Verify the emptied Bank balance on-chain.
    - [x] `US-SHER-002` Establish a real three-seat Board through the Elections and Board contracts.
    - [x] `US-SHER-002` Transfer Bank ownership to the Board.
    - [x] `US-SHER-002` Fund the Bank again.
    - [x] `US-SHER-002` Submit the second dividend through the owner browser.
    - [x] `US-SHER-002` Verify the zero-based Board action is persisted.
    - [x] `US-SHER-002` Verify that balances do not move before the approval quorum is reached.
    - [x] `US-SHER-002` Approve through a second Board-member browser.
    - [x] `US-SHER-002` Verify quorum execution.
    - [x] `US-SHER-002` Verify the Board approval event.
    - [x] `US-SHER-002` Verify the Board execution event.
    - [x] `US-SHER-002` Verify the Bank distribution event for the Board-approved dividend.
    - [x] `US-SHER-002` Verify the Investor distribution event for the Board-approved dividend.
    - [x] `US-SHER-002` Verify the owner's proportional payment for the Board-approved dividend.
    - [x] `US-SHER-002` Verify the member's proportional payment for the Board-approved dividend.
    - [x] `US-SHER-002` Verify the emptied Bank balance on-chain after the Board-approved dividend.
    - [x] `US-SHER-003` Reload and verify the two-shareholder cap table.
    - [x] `US-SHER-003` Reload and verify `75%` / `25%` ownership.
    - [x] `US-SHER-003` Reload and verify the grouped direct-owner distribution activity.
    - [x] `US-SHER-003` Reload and verify the grouped Board-approved distribution activity.
    - [x] `US-SHER-003` Reload and verify the shareholder payments in the distribution activities.
  - Expected result: direct-owner and Board-approved distributions produce the same durable proportional shareholder result.
  - Status: Integrated covered — direct-owner distribution and Board action approval/execution run through integrated main paths.
  - Evidence:
    [integrated shareholder issuance and dividend lifecycle](../../app/test/e2e/shareholder/shareholder-issuance-dividends.integrated.spec.ts).

- `E2E-PATH-08` — Complete a shareholder migration
  - Stories validated:
    - `US-SHER-006` — claim a migrated shareholding (owned evidence);
    - `US-SHER-007` — settle and close the migration (owned evidence);
    - `US-SHER-008` — start a shareholder migration (reference only; owned by `US-CONTRACT-005`).
  - Reused verification: `AC-US-CONTRACT-005-03` provides the owning Officer-redeployment and migration-root journey. This path does not
    reassign Contract Management ownership.
  - Dependencies: previous and current Investor generations, migration data, owner, and shareholder wallets.
  - Main path:
    - [x] `US-SHER-008` Create a two-holder previous Investor.
    - [x] `US-SHER-008` Redeploy the Officer through the portal.
    - [x] `US-SHER-008` Verify the real migration root.
    - [x] `US-SHER-008` Verify the persisted migration snapshot.
    - [x] `US-SHER-006` Change an old-contract balance after snapshot creation.
    - [x] `US-SHER-006` Self-claim the unchanged frozen allocation as that shareholder.
    - [x] `US-SHER-007` Dispatch the remaining allocation as the Investor owner.
    - [x] `US-SHER-007` Close the migration through the portal.
    - [x] `US-SHER-006` Reload and verify the final `75%` / `25%` cap table.
    - [x] `US-SHER-007` Reload and verify the completed migration state.
    - [x] `US-SHER-006` Reload and verify successful migration event receipts.
    - [x] `US-SHER-006` Verify that an additional claim is rejected.
    - [x] `US-SHER-002` Fund the current Bank after migration closure.
    - [x] `US-SHER-002` Distribute dividends after migration closure.
    - [x] `US-SHER-002` Verify that the migration freeze no longer blocks payouts.
  - Expected result: every frozen allocation exists exactly once in the current Investor, migration is closed, and dividends resume.
  - Status: Integrated covered.
  - Evidence: [integrated shareholder migration lifecycle](../../app/test/e2e/shareholder/shareholder-migration.integrated.spec.ts).

## G4 — Community Credit Lifecycle

- `E2E-PATH-09` — Publish, fund, repay, and inspect a credit round
  - Stories validated:
    - `US-CC-001` — inspect the Credit Account;
    - `US-CC-002` — publish a credit call;
    - `US-CC-003` — lend to an open round;
    - `US-CC-005` — repay lenders.
  - Actors: issuer and lender.
  - Dependencies: an operational company, current Community Credit contracts, and funded wallets.
  - Main path:
    - [ ] `US-CC-001` Inspect the initial Credit Account state.
    - [ ] `US-CC-002` Publish a credit call.
    - [ ] `US-CC-002` Verify the new round on-chain.
    - [ ] `US-CC-003` Lend to the round.
    - [ ] `US-CC-003` Verify lender balances and participation.
    - [ ] `US-CC-005` Repay the lenders.
    - [ ] `US-CC-005` Verify repayment receipts and final balances.
    - [ ] `US-CC-001` Reload the account.
    - [ ] `US-CC-001` Verify the complete round history.
  - Expected result: one credit round is traceable from publication through repayment.
  - Status: Planned — no integrated business path is currently linked.

- `E2E-PATH-10` — Recover a stalled credit round
  - Story validated: `US-CC-004` — resolve a stalled round.
  - Reason for isolation: the path deliberately creates an exceptional round state that must not block the normal credit lifecycle.
  - Dependencies: a disposable round created through the real product flow.
  - Main path:
    - [ ] `US-CC-004` Move the round into a supported stalled state.
    - [ ] `US-CC-004` Execute the issuer's recovery action.
    - [ ] `US-CC-004` Verify participant balances after recovery.
    - [ ] `US-CC-004` Verify the recovered round state.
    - [ ] `US-CC-004` Refresh and verify the recovery history.
  - Expected result: the exceptional round reaches its defined terminal state without corrupting other rounds.
  - Status: Planned — no integrated business path is currently linked.

## G5 — Payroll Lifecycle

- `E2E-PATH-11` — Configure and control member compensation
  - Stories validated:
    - `US-PAYROLL-001` — set a member's wage;
    - `US-PAYROLL-002` — pause or resume the wage.
  - Dependencies: an operational company with owner and member.
  - Main path:
    - [x] `US-PAYROLL-001` Create the member wage.
    - [x] `US-PAYROLL-001` Replace the member wage.
    - [x] `US-PAYROLL-002` Pause the member wage.
    - [x] `US-PAYROLL-002` Resume the member wage.
    - [x] `US-PAYROLL-001` Block a member without a wage.
    - [x] `US-PAYROLL-002` Reject a claim while the wage is paused.
    - [x] `US-PAYROLL-002` Submit a persisted claim after resuming the wage.
    - [x] `US-PAYROLL-001` Reload and verify the persisted active wage.
    - [x] `US-PAYROLL-002` Reload and verify the visible wage status.
  - Expected result: exactly one current wage controls the member's eligibility.
  - Status: Integrated partial — the owner and member journeys run against the real frontend, backend, PostgreSQL database, and local chain.
    A member without a wage is blocked and a paused wage is rejected by the backend; broader wage-form validation remains lower-level
    coverage.
  - Evidence: [integrated Payroll tests](../../app/test/e2e/payroll/payroll.integrated.spec.ts).

- `E2E-PATH-12` — Prepare a weekly claim
  - Stories validated:
    - `US-PAYROLL-004` — set weekly goals;
    - `US-PAYROLL-005` — submit a daily claim;
    - `US-PAYROLL-006` — edit a daily claim;
    - `US-PAYROLL-007` — delete a daily claim.
  - Dependencies: an active wage from `E2E-PATH-11`.
  - Main path:
    - [x] `US-PAYROLL-004` Save weekly goals.
    - [x] `US-PAYROLL-005` Create an eligible daily work entry.
    - [x] `US-PAYROLL-006` Edit an eligible daily work entry.
    - [x] `US-PAYROLL-007` Delete an eligible daily work entry.
    - [x] `US-PAYROLL-005` Recreate the final entry set.
    - [x] `US-PAYROLL-005` Verify weekly totals.
    - [x] `US-PAYROLL-005` Preserve the valid entry while rejecting daily cap overages.
    - [x] `US-PAYROLL-005` Preserve the valid entry while rejecting weekly cap overages.
  - Expected result: the member reaches a deterministic claim-ready week.
  - Status: Integrated partial — one real member identity saves goals and prepares a persisted claim through the product UI. Daily form
    validation and the server-side weekly cap preserve the valid entry; attachments and other rejected edits remain separately covered.
  - Evidence: [integrated Payroll tests](../../app/test/e2e/payroll/payroll.integrated.spec.ts).

- `E2E-PATH-13` — Approve, reconcile, withdraw, and review payroll
  - Stories validated:
    - `US-PAYROLL-008` — sign a completed weekly claim;
    - `US-PAYROLL-009` — disable or re-enable a signed claim;
    - `US-PAYROLL-010` — withdraw an approved claim;
    - `US-PAYROLL-011` — reconcile claims with the chain;
    - `US-PAYROLL-012` — review payroll history;
    - `US-PAYROLL-013` — review the Payroll account position.
  - Reused dependency: `US-PAYROLL-003` references the Accounts-owned funding journey and is not revalidated here.
  - Dependencies: a claim-ready week, current contract owner, and funded Payroll contract.
  - Main path:
    - [x] `US-PAYROLL-008` Sign the completed weekly claim.
    - [x] `US-PAYROLL-009` Disable the signed weekly claim.
    - [x] `US-PAYROLL-009` Re-enable the signed weekly claim without creating a second claim.
    - [x] `US-PAYROLL-010` Withdraw native compensation through a real chain transaction.
    - [x] `US-PAYROLL-010` Withdraw USDC compensation through a real chain transaction.
    - [x] `US-PAYROLL-010` Mint SHER through a real chain transaction.
    - [x] `US-PAYROLL-010` Verify the decoded withdrawal payload.
    - [x] `US-PAYROLL-010` Verify the withdrawal token decimals.
    - [x] `US-PAYROLL-011` Reconcile backend and chain state.
    - [x] `US-PAYROLL-012` Reload and verify member history.
    - [x] `US-PAYROLL-012` Reload and verify owner history.
    - [x] `US-PAYROLL-009` Keep signed claims read-only for the member.
    - [x] `US-PAYROLL-009` Keep disabled claims read-only for the member.
    - [x] `US-PAYROLL-010` Keep withdrawn claims read-only for the member.
    - [x] `US-PAYROLL-008` Block non-owner signing controls.
    - [x] `US-PAYROLL-010` Block non-owner withdrawal controls.
    - [x] `US-PAYROLL-010` Retain a signed claim when Payroll has insufficient USDC.
    - [x] `US-PAYROLL-013` Open Payroll Account after funding and withdrawal.
    - [x] `US-PAYROLL-013` Verify exact Payroll token holdings.
    - [x] `US-PAYROLL-013` Verify read-only member access.
    - [ ] `US-PAYROLL-013` Verify account summaries in the integrated browser journey.
    - [ ] `US-PAYROLL-013` Verify account activity and filters in the integrated browser journey.
  - Expected result: one claim remains traceable from approval through payment, account position, and history.
  - Status: Integrated partial — the browser funds Payroll through Bank, signs a completed-week claim, verifies the disabled and paid chain
    flags, withdraws as the paid member, and reloads both perspectives. It also verifies the role-gated controls, frozen lifecycle states,
    and the contract's insufficient-funds rejection. Payroll Account holdings and member access are included; integrated activity and
    summary checks remain planned. The current-month summary boundary is covered by frontend tests. Invalid EIP-712 signatures are rejected
    by the backend signature-validator test rather than an integrated browser journey, because a true integrated wallet produces valid
    signatures.
  - Evidence: [integrated Payroll payment test](../../app/test/e2e/payroll/payroll-payment.integrated.spec.ts) and
    [insufficient-funding test](../../app/test/e2e/payroll/payroll-insufficient-funds.integrated.spec.ts).

## G6 — Expense Account Lifecycle

- `E2E-PATH-14` — Approve, spend, control, and audit an expense allowance
  - Stories validated:
    - `US-EXP-001` — grant a signed spending approval;
    - `US-EXP-002` — spend from the Expense Account;
    - `US-EXP-003` — deactivate or reactivate the approval;
    - `US-EXP-004` — review the account and its history.
  - Actors: Expense Account owner and approved recipient.
  - Dependencies: an operational company, funded Expense Account, and both wallets.
  - Main path:
    - [x] `US-EXP-001` Create a correctly scoped signed approval.
    - [x] `US-EXP-001` Verify the approval persists.
    - [x] `US-EXP-002` Spend within the approval.
    - [x] `US-EXP-002` Verify the recipient balance.
    - [x] `US-EXP-002` Verify the Expense Account contract balance.
    - [x] `US-EXP-003` Deactivate the approval.
    - [x] `US-EXP-003` Verify its disabled state.
    - [ ] `US-EXP-002` Attempt spending while the approval is deactivated.
    - [ ] `US-EXP-003` Verify that spending is blocked while the approval is deactivated.
    - [x] `US-EXP-003` Reactivate the approval.
    - [x] `US-EXP-003` Verify its active state.
    - [ ] `US-EXP-002` Complete another valid spend after reactivation.
    - [ ] `US-EXP-004` Reload and verify the balances.
    - [ ] `US-EXP-004` Reload and verify the approval state.
    - [ ] `US-EXP-004` Reload and verify the transaction history.
  - Separate variants: overspending, invalid signatures, unauthorized actions, and insufficient funds.
  - Expected result: one allowance remains auditable across its complete active and inactive lifecycle.
  - Status: Integrated partial — the main persisted approval, member spend, lifecycle control, balances, and in-flow history sequence is
    executable. Post-reload and negative spend assertions remain planned. Invalid signatures, overspending, authorization failures, and
    insufficient-fund variants remain browser acceptance or lower-layer coverage.
  - Evidence: [integrated Accounts test](../../app/test/e2e/accounts.integrated.spec.ts).

## G7 — Cross-Feature Accounting Verification

- `E2E-PATH-15` — Trace source operations through the company books
  - Stories validated:
    - `US-ACCT-001` — view the Accounting overview;
    - `US-ACCT-002` — trace operations in the General Ledger;
    - `US-ACCT-003` — review financial statements;
    - `US-ACCT-005` — review historical contract activity.
  - Reused dependencies: representative Bank, shareholder, credit, payroll, and expense transactions from their owning paths.
  - Main path:
    - [ ] `US-ACCT-001` Load the complete Accounting journal after the source operations.
    - [ ] `US-ACCT-002` Verify every source operation produces one balanced journal entry.
    - [ ] `US-ACCT-002` Trace journal entries to their source transactions.
    - [ ] `US-ACCT-002` Trace journal entries to concrete company accounts.
    - [ ] `US-ACCT-003` Verify the Income Statement uses the balanced snapshot.
    - [ ] `US-ACCT-003` Verify the Balance Sheet uses the balanced snapshot.
    - [ ] `US-ACCT-003` Verify the Trial Balance uses the balanced snapshot.
    - [ ] `US-ACCT-005` Verify historical Officer generations remain separate.
    - [ ] `US-ACCT-005` Verify historical Officer generations remain complete.
    - [ ] `US-ACCT-001` Refresh and verify that the same books are reconstructed.
  - Expected result: the company books reconcile with cross-feature persisted and on-chain evidence.
  - Status: Planned — no integrated business path is currently linked.

- `E2E-PATH-16` — Classify an external withdrawal and export the reviewed books
  - Stories validated:
    - `US-ACCT-006` — classify an external withdrawal;
    - `US-ACCT-004` — export Accounting reports.
  - Dependencies: reviewed journal and statements from `E2E-PATH-15` and deterministic valuation inputs.
  - Main path:
    - [ ] `US-ACCT-006` Classify an unassigned external withdrawal.
    - [ ] `US-ACCT-006` Verify that the classification persists.
    - [ ] `US-ACCT-006` Verify that the classification updates the affected reports.
    - [ ] `US-ACCT-004` Export the selected reports.
    - [ ] `US-ACCT-004` Verify exported filters match the reviewed UI state.
    - [ ] `US-ACCT-004` Verify exported rows match the reviewed UI state.
    - [ ] `US-ACCT-004` Verify exported totals match the reviewed UI state.
  - Expected result: the reviewed classification and exported books preserve the same accounting snapshot.
  - Status: Planned — no integrated business path is currently linked.

## G8 — Board Election Lifecycle

- `E2E-PATH-17` — Create, vote, publish, and review a Board election
  - Stories validated:
    - `US-EL-01` — create a Board election;
    - `US-EL-02` — cast a vote;
    - `US-EL-03` — publish election results;
    - `US-EL-04` — request election-created notifications;
    - `US-EL-07` — view the current Board of Directors;
    - `US-EL-08` — review a published election.
  - Actors: company owner and eligible voter.
  - Dependencies: a company with Elections and Board of Directors contracts and funded local wallets.
  - Main path:
    - [x] `US-AUTH-001` Register the actors through the real stack.
    - [x] `US-COMPANIES-001` Create an operational company through the real stack.
    - [x] `US-COMPANIES-002` Deploy the company's contracts through the real stack.
    - [x] `US-COMPANIES-005` Add the company members through the real stack.
    - [x] `US-EL-01` Create an election through the portal.
    - [x] `US-EL-01` Verify the election configuration on-chain.
    - [x] `US-EL-01` Verify the fixed eligible-voter snapshot on-chain.
    - [x] `US-EL-04` Verify the backend persists member notifications.
    - [x] `US-EL-04` Open the persisted notification as an eligible member.
    - [x] `US-EL-04` Mark the notification as read.
    - [x] `US-EL-04` Follow the notification to the election.
    - [x] `US-EL-02` Cast a ballot.
    - [x] `US-EL-02` Verify the recorded choice.
    - [x] `US-EL-02` Verify the vote count.
    - [x] `US-EL-02` Verify the refreshed portal state.
    - [x] `US-EL-03` Publish the election results.
    - [x] `US-EL-03` Verify the published state on-chain.
    - [x] `US-EL-03` Verify the published state in the portal.
    - [x] `US-EL-07` Verify Board membership on-chain.
    - [x] `US-EL-07` Verify Board membership in the portal.
    - [x] `US-EL-03` Verify that the next election is available.
    - [x] `US-EL-08` Reload and open the published election from history.
    - [x] `US-EL-08` Review the elected Board.
  - Separate variants: rejected wallet requests for creation, voting, and publication; notification failures; and archived-company write
    guards remain controlled mocked-browser acceptance tests.
  - Expected result: the election remains traceable from creation through the elected Board and published history.
  - Status: Integrated covered — the production frontend, owned backend, database, and local chain run together. Controlled recovery and
    guard variants remain browser acceptance.
  - Evidence: [integrated election lifecycle](../../app/test/e2e/elections/elections.integrated.spec.ts) and
    [mocked browser election variants](../../app/test/e2e/elections/elections.spec.ts).

## Cross-Group Execution Rules

- Verify shared technical prerequisites with G0 before Playwright; scenario-specific teams may be prepared by the authenticated Node-side
  factory. The integrated authentication test checks browser/backend chain identity during the SIWE journey.
- Give every story one primary owning path; reused stories and fixtures are dependencies, not duplicate coverage claims.
- Use isolated or uniquely identified data for every path.
- A failed dependency marks the consuming path blocked, not failed on its own story assertion.
- Keep the main business path compact; implement permission, validation, and recovery branches as separately runnable tests.
- Do not mark a complete story E2E-covered from a representative grouped path alone; remaining acceptance criteria still need evidence.

## Related Product Criteria

- [Companies user stories](../features/companies/README.md)
- [Accounts user stories](../features/accounts/README.md)
- [Shareholder Management user stories](../features/shareholder-management/README.md)
- [Community Credit user stories](../features/community-credit/README.md)
- [Payroll user stories](../features/payroll/README.md)
- [Accounting user stories](../features/accounting/README.md)
- [Board Elections user stories](../features/elections/README.md)
