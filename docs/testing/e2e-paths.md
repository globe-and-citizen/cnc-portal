# Integrated E2E Checklist

**Scope:** G0 technical foundation through G7 cross-feature Accounting verification

This checklist defines what an integrated E2E execution must verify. Its checkboxes are execution requirements, not a record of the latest
test result. The latest pass or failure belongs in Playwright and CI reports.

The canonical product outcomes remain in the [Companies](../features/companies/README.md) and [Accounts](../features/accounts/README.md)
user stories. Referencing a story or acceptance criterion below records the intended test coverage; it does not change its
product-validation status.

## Group Catalogue

- G0 — Integrated technical foundation.
- G1 — Company onboarding and treasury setup.
- G2 — Company management and member access.
- G3 — Shareholder Management and SHER.
- G4 — Community Credit.
- G5 — Payroll.
- G6 — Expense Account.
- G7 — Accounting verification across the preceding transaction groups.

G0 and G1 have executable path definitions below. G2 through G7 are registered as the next test groups; their stable path IDs and
representative AC subsets must be allocated when each group is decomposed into independently resettable scenarios.

## Integration Boundary

- Real boundaries:
  - browser and production frontend code;
  - SIWE authentication and backend authorization;
  - backend routes and controllers;
  - isolated PostgreSQL database with the current migrations;
  - local Hardhat node, deployed contracts, transactions, receipts, and events.
- Simulated boundaries:
  - external services that are not owned by CNC Portal, such as token-price providers.
- Coverage rule:
  - a user story is validated only when the path performs its observable action and verifies the resulting persisted or on-chain state;
  - data created through an API fixture, database seed, or chain snapshot is a dependency and does not validate the corresponding story;
  - every path must be independently resettable so that one failure does not invalidate unrelated paths.

## G0 — Integrated Technical Foundation

- `E2E-PATH-00` — Prepare an isolated full-stack test environment
  - Story coverage: none; G0 prepares dependencies but does not validate a product user story.
  - Required checks:
    - [ ] Start a disposable PostgreSQL database that cannot modify developer data.
    - [ ] Apply the current backend migrations successfully.
    - [ ] Start the real backend against the disposable database.
    - [ ] Start a fresh local Hardhat node.
    - [ ] Deploy the required token, Safe, Officer, and account infrastructure to the local node.
    - [ ] Confirm the backend reads the same local chain used by the browser.
    - [ ] Provision the owner and member through valid SIWE authentication.
    - [ ] Confirm the frontend, backend, database, and chain health checks pass before G1 starts.
    - [ ] Provide deterministic, resettable database and blockchain state.
    - [ ] Stop the services and remove disposable state after the run, including after failure or interruption.
  - Output:
    - a healthy base state that every G1 path can consume;
    - a G0 failure blocks every path that depends on the missing boundary.

## G1 — Company Onboarding and Treasury Setup

- `E2E-FLOW-G1-ONBOARDING` — Create, deploy, then open an operational company
  - Story flow: `US-COMPANIES-001` → `US-COMPANIES-002` → `US-COMPANIES-003`.
  - Path composition: `E2E-PATH-01` → `E2E-PATH-02` → `E2E-PATH-05`.
  - Execution rule: one browser test keeps the same authenticated owner and persisted company across the three paths.
  - Verification boundary: the test submits the company to the real backend, sends the Officer deployment transaction to the local chain,
    verifies backend and on-chain state, then finds and reopens the same company from the Companies list.
  - Isolation rule: validation, authorization, and failure variants remain separate tests so one injected failure does not invalidate the
    main flow.

- `E2E-PATH-01` — Create a company workspace
  - Primary story: `US-COMPANIES-001`.
  - Representative criteria:
    - `AC-US-COMPANIES-001-01` — required name and optional description;
    - `AC-US-COMPANIES-001-02` — zero or more initial members;
    - `AC-US-COMPANIES-001-03` — creator becomes owner and member, and the company persists.
  - Actor: company creator.
  - Dependencies:
    - G0 is healthy;
    - an optional member may already exist as fixture data, which does not validate member creation.
  - Required checks:
    - [ ] Sign in through the real SIWE flow.
    - [ ] Enter the company name and description through the UI.
    - [ ] Select an existing member through the UI.
    - [ ] Submit the company through the real backend.
    - [ ] Verify PostgreSQL contains the company, owner, creator membership, and selected membership.
    - [ ] Reload the browser and verify the company remains available.
  - Expected result: the company exists independently of browser memory and the owner can continue to Officer setup.

- `E2E-PATH-02` — Deploy and register the initial Officer suite
  - Primary story: `US-COMPANIES-002`.
  - Representative criteria:
    - `AC-US-COMPANIES-002-01` — the owner provides the initial SHER name and symbol;
    - `AC-US-COMPANIES-002-02` — deployment address and metadata are registered;
    - `AC-US-COMPANIES-002-03` — refreshed Officer data allows the flow to continue to Safe setup.
  - Actor: company owner.
  - Dependencies:
    - a persisted company from `E2E-PATH-01`, or an equivalent real-backend fixture;
    - G0 contract infrastructure.
  - Required checks:
    - [ ] Enter the SHER name and symbol through the UI.
    - [ ] Submit a real deployment transaction to Hardhat.
    - [ ] Verify the receipt created an Officer and its required child contracts.
    - [ ] Verify the Investor contract stores the submitted SHER name and symbol.
    - [ ] Verify the backend registered the Officer address, block metadata, and synchronized contracts.
    - [ ] Refresh the company and verify the registered Officer remains current.
    - [ ] Verify the onboarding flow reaches Safe setup.
  - Expected result: the company has one persisted current Officer generation backed by deployed local contracts.

- `E2E-PATH-03` — Configure the company Safe
  - Primary story: `US-SAFE-001`.
  - Representative criteria for the deployment branch:
    - `AC-US-SAFE-001-01` — deploy a new Safe;
    - `AC-US-SAFE-001-03` — register the Safe with the company;
    - `AC-US-SAFE-001-05` — initialize the owner as the only signer with threshold one.
  - Actor: company owner.
  - Dependencies:
    - a persisted company;
    - G0 Safe infrastructure;
    - Officer setup is optional for this path.
  - Required deployment branch:
    - [ ] Deploy a new Safe through the UI and submit the real chain transaction.
    - [ ] Verify the deployed Safe code, owner list, and threshold on Hardhat.
    - [ ] Verify the backend registered the Safe with the correct company.
    - [ ] Reload the Safe route and verify its address, owners, and threshold remain visible.
  - Alternative import branch:
    - [ ] Inspect an existing local Safe without changing its configuration.
    - [ ] Register it with the company through the real backend.
    - [ ] Verify its original owners and threshold remain unchanged after reload.
  - Optionality and ownership:
    - Safe setup may be skipped during company onboarding;
    - this path owns Safe-setup validation even when another group reuses the registered Safe as a dependency.
  - Expected result: the company references one usable Safe whose on-chain configuration matches the refreshed UI.

- `E2E-PATH-04` — Fund the company Bank
  - Primary story: `US-BANK-001`.
  - Representative criteria:
    - `AC-US-BANK-001-01` — deposit the native token;
    - `AC-US-BANK-001-02` — deposit a supported ERC-20 token;
    - `AC-US-BANK-001-03` — increase the corresponding Bank balance.
  - Actor: company member.
  - Dependencies:
    - a persisted company;
    - a deployed and backend-registered current Officer and Bank;
    - funded local test wallet.
  - Required checks:
    - [ ] Open the registered Bank through the company UI.
    - [ ] Submit a real native-token deposit and verify its successful receipt.
    - [ ] Verify the Bank native balance increased by the deposited amount.
    - [ ] Submit a real supported ERC-20 deposit and verify its successful receipt.
    - [ ] Verify the Bank token balance increased by the deposited amount.
    - [ ] Verify both deposits appear in Bank history.
    - [ ] Reload the page and verify balances and history are reconstructed from chain state.
  - Expected result: the Bank holds both assets and exposes durable transaction evidence after refresh.

- `E2E-PATH-05` — Browse and open an operational company
  - Primary story: `US-COMPANIES-003`.
  - Representative criteria:
    - `AC-US-COMPANIES-003-01` — a member can see and open an active visible company;
    - `AC-US-COMPANIES-003-02` — the opened company exposes its metadata, members, lifecycle state, and available features.
  - Actor: company member who is not required to be the owner.
  - Dependencies:
    - the member belongs to a persisted company;
    - the company may be prepared through the real backend because creation is a dependency in this path.
  - Required checks:
    - [ ] Sign in as the member through the real SIWE flow.
    - [ ] Verify the Companies list is scoped to that member.
    - [ ] Open the expected company from its list entry.
    - [ ] Verify the company metadata and member context load from the backend.
    - [ ] Verify the routes for the company's available contract-backed features can be reached.
    - [ ] Reload the workspace and verify the member retains access.
  - Expected result: a member can recover the operational company context from persisted backend and chain state.

## G2 — Company Management and Member Access

- Canonical stories:
  - `US-COMPANIES-004` — update company details;
  - `US-COMPANIES-005` — manage company members;
  - `US-COMPANIES-006` — archive or restore a company;
  - `US-COMPANIES-007` — control personal company-list visibility;
  - `US-COMPANIES-008` — permanently delete a company.
- Dependencies:
  - G0;
  - a persisted company and owner from G1;
  - a second member when permission or visibility isolation is checked.
- Planned path coverage:
  - [ ] Update company metadata and verify persistence after reload.
  - [ ] Add and remove a member and verify access changes for both wallets.
  - [ ] Archive and restore a company and verify write restrictions during the archived state.
  - [ ] Hide and show a company for one member without changing another member's list.
  - [ ] Delete a company as its owner and verify it can no longer be opened.
  - [ ] Verify non-owners cannot execute owner-only management actions.
- Status: group registered; detailed path and AC mapping pending.

## G3 — Shareholder Management and SHER

- Canonical stories:
  - `US-SHER-001` — invest in the Safe and receive SHER;
  - `US-SHER-002` — distribute dividends;
  - `US-SHER-003` — review shareholder position and activity;
  - `US-SHER-004` — issue SHER;
  - `US-SHER-005` — configure shareholder investment;
  - `US-SHER-006` — claim a migrated shareholding;
  - `US-SHER-007` — settle and close a shareholder migration;
  - `US-SHER-008` — start a shareholder migration.
- Dependencies:
  - G0;
  - the current Officer and Investor from G1;
  - the registered Safe and Bank where the selected story requires them;
  - funded shareholder wallets.
- Planned path coverage:
  - [ ] Configure the Safe Deposit Router and investment terms.
  - [ ] Invest supported funds, verify the Safe receipt, and verify SHER issuance.
  - [ ] Issue SHER directly with the required role and verify the cap table.
  - [ ] Distribute a dividend and verify proportional shareholder receipts.
  - [ ] Reload shareholder balances, ownership percentages, and activity from chain state.
  - [ ] Exercise the redeployment, migration claim, settlement, and closure lifecycle.
- Reuse rule: G1 supplies the contracts; G3 owns the shareholder actions and their resulting state.
- Status: group registered; detailed path and AC mapping pending.

## G4 — Community Credit

- Canonical stories:
  - `US-CC-001` — inspect the Credit Account;
  - `US-CC-002` — publish a credit call;
  - `US-CC-003` — lend to an open round;
  - `US-CC-004` — resolve a stalled round;
  - `US-CC-005` — repay lenders.
- Dependencies:
  - G0;
  - a G1 operational company and current Community Credit contracts;
  - issuer and lender wallets with the required balances.
- Planned path coverage:
  - [ ] Open the Credit Account and verify its current contract state.
  - [ ] Publish a credit call and verify the new round on-chain.
  - [ ] Lend to an open round and verify balances and participation.
  - [ ] Exercise the supported stalled-round resolution.
  - [ ] Repay lenders and verify the resulting balances and activity after reload.
- Status: group registered; detailed path and AC mapping pending.

## G5 — Payroll

- Canonical stories:
  - `US-PAYROLL-001` through `US-PAYROLL-012`;
  - `US-PAYROLL-003` remains a reference to the Accounts-owned Bank transfer journey.
- Dependencies:
  - G0;
  - a G1 operational company with owner and member;
  - the current Cash Remuneration contract;
  - sufficient contract funding for non-mintable compensation.
- Planned path coverage:
  - [ ] Create, replace, pause, and resume a member wage through the real backend.
  - [ ] Save weekly goals and create, edit, or delete eligible daily claims.
  - [ ] Complete and sign a weekly claim with the current contract owner.
  - [ ] Withdraw an approved claim through a real chain transaction.
  - [ ] Reconcile persisted claim state with chain state after refresh.
  - [ ] Review member and owner payroll history.
  - [ ] Verify archived-company, disabled-wage, authorization, and insufficient-funding boundaries.
- Reuse rule: funding the Payroll contract is validated by the Accounts-owned transfer path, then consumed here as a dependency.
- Status: group registered; detailed path and AC mapping pending.

## G6 — Expense Account

- Canonical stories:
  - `US-EXP-001` — grant a signed spending approval;
  - `US-EXP-002` — spend from the Expense Account;
  - `US-EXP-003` — deactivate or reactivate an approval;
  - `US-EXP-004` — review the account and its history.
- Dependencies:
  - G0;
  - a G1 operational company with owner and approved recipient;
  - the current Expense Account contract with sufficient funds.
- Planned path coverage:
  - [ ] Create and persist a correctly scoped signed approval.
  - [ ] Spend within the approval and verify the real recipient and contract balance changes.
  - [ ] Reject overspending, invalid signatures, and unauthorized actions without changing balances.
  - [ ] Deactivate and reactivate the approval and verify spending eligibility.
  - [ ] Reload balances, approvals, and transaction history from backend and chain evidence.
- Status: group registered; detailed path and AC mapping pending.

## G7 — Cross-Feature Accounting Verification

- Canonical stories:
  - `US-ACCT-001` — view the Accounting overview;
  - `US-ACCT-002` — trace operations in the General Ledger;
  - `US-ACCT-003` — review financial statements;
  - `US-ACCT-004` — export Accounting reports;
  - `US-ACCT-005` — review historical contract activity;
  - `US-ACCT-006` — classify an external withdrawal.
- Dependencies:
  - G0 and a G1 operational company;
  - transaction evidence produced by selected G1, G3, G4, G5, and G6 paths;
  - deterministic valuation inputs for the tested transaction dates.
- Planned path coverage:
  - [ ] Generate representative Bank, shareholder, credit, payroll, and expense operations through their owning groups.
  - [ ] Verify each source operation produces the expected balanced journal entry exactly once.
  - [ ] Verify internal company-pocket transfers do not create revenue or expense.
  - [ ] Trace each operation through the General Ledger and its transaction evidence.
  - [ ] Verify the Income Statement, Balance Sheet, and Trial Balance use the same journal snapshot and remain balanced.
  - [ ] Verify historical Officer generations remain separate and complete.
  - [ ] Classify an external withdrawal and verify the classification persists.
  - [ ] Export the selected reports and verify they preserve the reviewed filters and totals.
  - [ ] Refresh Accounting and verify it reconstructs the same complete books.
- Ownership rule: G7 verifies the accounting consequences of source operations; it does not replace or claim the product actions owned by
  G1, G3, G4, G5, or G6.
- Status: group registered; detailed path and AC mapping pending.

## Cross-Group Execution Rules

- Run G0 before every functional path.
- Run each functional path with isolated or uniquely identified data.
- A failed dependency marks the consuming path blocked, not failed on its user-story assertion.
- A fixture supplied by an earlier group is reused evidence, not new validation of the story that created it.
- Do not mark a complete user story E2E-covered from representative happy paths alone; remaining acceptance criteria require their own
  representative success, permission, validation, or recovery paths.

## Related Product Criteria

- Current product criteria:
  - [Companies user stories](../features/companies/README.md)
  - [Accounts user stories](../features/accounts/README.md)
  - [Shareholder Management user stories](../features/shareholder-management/README.md)
  - [Community Credit user stories](../features/community-credit/README.md)
  - [Payroll user stories](../features/payroll/README.md)
  - [Accounting user stories](../features/accounting/README.md)
