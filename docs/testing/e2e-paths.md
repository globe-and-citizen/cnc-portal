# Integrated E2E Checklist

**Scope:** G0 technical readiness through G7 cross-feature Accounting verification

This checklist organizes integrated E2E coverage around business paths rather than one path per user story. A path may validate several
stories when the same actors, persisted state, and UX sequence connect them naturally.

The canonical product outcomes remain in the linked feature documentation. Story and acceptance-criterion references below define intended
coverage; the latest execution result and artifacts belong in Playwright and CI reports.

## Path Model

- One path represents one coherent business objective from an actor's point of view.
- The main success sequence should run as one browser test when later actions consume state created by earlier actions.
- Validation, authorization, recovery, and injected-failure branches remain separate tests attached to the same path.
- A story is validated only when the path performs its observable action and verifies the resulting backend, database, or chain state.
- Seeded or API-created state is a dependency, not evidence that the story creating that state passed.
- Keep a destructive terminal action in its own path when it would prevent subsequent checks or make failures harder to diagnose.

## Group Catalogue

- G0 — Integrated technical readiness.
- G1 — Company onboarding and treasury readiness.
- G2 — Company administration and member access.
- G3 — Shareholder lifecycle and SHER.
- G4 — Community Credit lifecycle.
- G5 — Payroll lifecycle.
- G6 — Expense Account lifecycle.
- G7 — Cross-feature Accounting verification.

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
  - the E2E test checks readiness and exercises product behaviour, but does not own service startup.
- Browser-action rule:
  - Playwright may submit a contract transaction only through a user-accessible product action;
  - Playwright must not deploy fixture infrastructure, alter contract code or balances, control mining, or mutate chain state directly
    through RPC methods.
- Execution profiles:
  - `@integrated` paths use the developer- or CI-managed frontend, backend, database, and local chain without intercepting CNC Portal
    boundaries;
  - `@browser` scenarios may inject backend state, direct fixture setup, wallet failures, or network outcomes and do not count as integrated
    E2E evidence;
  - `@mocked` is the narrower marker for browser scenarios that explicitly replace a product boundary;
  - run every migrated integrated path with `npm run test:e2e` from `app/`;
  - run browser acceptance with `npm run test:browser:acceptance` from `app/`;
  - both commands only select Playwright tests; neither provisions services, contracts, or fixtures;
  - the developer or CI prepares the selected profile before invoking either command.
- CI ownership:
  - one `Full-stack E2E` job owns both phases and publishes separate browser-acceptance and integrated reports;
  - the job starts one local node, provisions browser fixtures outside Playwright, and starts the browser frontend before the first phase;
  - it then resets that node, provisions a disposable PostgreSQL database, applies migrations, deploys integrated infrastructure, and starts
    the backend and integrated frontend before the second phase;
  - Playwright still performs only user-accessible product actions, and CI retains reports plus failure traces and stack logs as evidence.

## G0 — Integrated Technical Readiness

- `E2E-PATH-00` — Validate the externally prepared test stack
  - Stories validated: none; this path only proves that product paths can start.
  - Required checks:
    - [ ] Confirm the frontend health check succeeds.
    - [ ] Confirm the backend health check succeeds.
    - [ ] Confirm the migrated database is reachable through the backend.
    - [ ] Confirm the local node uses the expected chain and contains the required deployed infrastructure.
    - [ ] Confirm the browser and backend target the same local chain.
    - [ ] Authenticate the owner and member through SIWE.
  - Expected result: every required boundary is ready before a functional path begins.
  - Status: partial; real SIWE authentication is executable, while explicit frontend/backend/database/chain readiness assertions remain to
    be added.
  - Owning stories: `US-AUTH-001`; `US-AUTH-002` and `US-AUTH-003` remain outside this client path.
  - Evidence: [integrated authentication test](../../app/test/e2e/authentication.integrated.spec.ts).

## G1 — Company Onboarding and Treasury Readiness

- `E2E-PATH-01` — Create, deploy, and reopen an operational company
  - Stories validated:
    - `US-COMPANIES-001` — create a company workspace;
    - `US-COMPANIES-002` — deploy the initial Officer suite;
    - `US-COMPANIES-003` — browse and open the company.
  - Actors: company creator and owner; the owner also satisfies the member role for the list journey.
  - Dependencies: G0 and predeployed Officer infrastructure.
  - Main path:
    - [ ] Sign in through SIWE.
    - [ ] Enter company metadata and submit it through the real backend.
    - [ ] Verify the company, owner, and creator membership persisted.
    - [ ] Enter the SHER name and symbol.
    - [ ] Submit a real Officer deployment transaction.
    - [ ] Verify the receipt, Officer, child contracts, and Investor metadata on-chain.
    - [ ] Verify the backend registered the Officer address and deployment metadata.
    - [ ] Continue past the optional Safe step.
    - [ ] Find the company in the Companies list and reopen its workspace.
    - [ ] Verify its metadata, members, lifecycle state, and feature navigation.
  - Separate variants:
    - required-field and member-address validation;
    - wallet rejection or reverted deployment;
    - failed Officer registration after a successful transaction;
    - non-owner member access and unavailable workspace states.
  - Expected result: the same persisted company moves from creation to a contract-backed workspace and remains recoverable from the list.
  - Status: executable locally; required-field, member-address, failed-create, and wallet-rejection variants use mocked browser boundaries.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked browser variants](../../app/test/e2e/company/company.mocked.spec.ts).

- `E2E-PATH-02` — Establish the company treasury
  - Stories validated:
    - `US-SAFE-001` — configure the company Safe;
    - `US-BANK-001` — fund the company Bank.
  - Actors: company owner, then company member.
  - Dependencies: an operational company from `E2E-PATH-01`, deployed Safe infrastructure, and funded local wallets.
  - Main path:
    - [ ] Deploy a Safe through the UI with a real transaction.
    - [ ] Verify its code, owner list, threshold, and backend registration.
    - [ ] Open the current Bank from the same company.
    - [ ] Deposit the native token and verify its receipt and balance change.
    - [ ] Deposit a supported ERC-20 token and verify its receipt and balance change.
    - [ ] Reload and verify that the Safe, balances, and Bank history remain available.
  - Alternative branch: import an existing local Safe and verify its owners and threshold remain unchanged.
  - Separate variants: rejected wallet requests, failed Safe registration, unsupported imports, and failed deposits.
  - Expected result: the company has a registered Safe and a funded Bank backed by durable chain evidence.
  - Status: partial; Safe deployment, backend registration, Bank deposits, balances, and history run through the integrated stack. Safe
    import and injected failure variants remain browser acceptance coverage.
  - Evidence: [integrated Accounts test](../../app/test/e2e/accounts.integrated.spec.ts).

## G2 — Company Administration and Member Access

- `E2E-PATH-03` — Maintain company identity and membership
  - Stories validated:
    - `US-COMPANIES-004` — update company details;
    - `US-COMPANIES-005` — manage company members.
  - Actors: company owner and invited member.
  - Dependencies: a persisted company from G1 and a second authenticated portal user.
  - Main path:
    - [ ] Update the company name and description and verify persistence in the workspace and list.
    - [ ] Add the second user as a member.
    - [ ] Sign in as that member and verify workspace access.
    - [ ] Remove the member and verify the membership and access changes persist.
  - Separate variants: invalid metadata, existing members, owner removal, non-owner writes, archived-company writes, and rejected requests.
  - Expected result: company identity and membership remain consistent for both actors.
  - Status: partial; metadata and membership mutations now share one integrated path, while second-user access remains planned.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked update variants](../../app/test/e2e/company/company-update.spec.ts).

- `E2E-PATH-04` — Suspend and recover company access
  - Stories validated:
    - `US-COMPANIES-007` — control personal company-list visibility;
    - `US-COMPANIES-006` — archive or restore a company.
  - Actors: company member and company owner.
  - Dependencies: a persisted company with both actors from `E2E-PATH-03`.
  - Main path:
    - [ ] Hide and recover the company from the member's own list.
    - [ ] Verify the owner's list is unaffected by the member's visibility preference.
    - [ ] Archive the company as owner.
    - [ ] Verify default-list exclusion and archived-list recovery.
    - [ ] Verify company writes are frozen while personal visibility remains changeable.
    - [ ] Restore the company and verify its normal actions return.
  - Separate variants: non-member visibility changes, non-owner lifecycle changes, and rejected archived writes.
  - Expected result: personal visibility and company lifecycle remain distinct and recoverable.
  - Status: partial; archive/restore and hide/show now share one integrated path, while cross-wallet isolation remains planned.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts),
    [mocked lifecycle variants](../../app/test/e2e/company/company-archive.spec.ts), and
    [mocked visibility variants](../../app/test/e2e/company/company-visibility.spec.ts).

- `E2E-PATH-05` — Permanently retire a company
  - Story validated: `US-COMPANIES-008` — permanently delete a company.
  - Reason for isolation: deletion is terminal and would destroy the shared state needed by other G2 paths.
  - Actor: company owner.
  - Dependencies: a disposable company whose preceding lifecycle evidence has already been collected.
  - Main path:
    - [ ] Cancel once and verify the company remains available.
    - [ ] Confirm deletion and verify the Companies list is restored.
    - [ ] Verify the company endpoint returns unavailable and related records are removed.
  - Separate variants: non-owner and rejected deletion.
  - Expected result: the deleted workspace cannot be reopened or restored.
  - Status: partial; cancellation and permanent removal pass, while cascade evidence remains to be added.
  - Evidence: [integrated company tests](../../app/test/e2e/company/company.integrated.spec.ts) and
    [mocked deletion variants](../../app/test/e2e/company/company-delete.spec.ts).

## G3 — Shareholder Lifecycle and SHER

- `E2E-PATH-06` — Configure investment, invest, and review the shareholder position
  - Stories validated:
    - `US-SHER-005` — configure shareholder investment;
    - `US-SHER-001` — invest in the Safe and receive SHER;
    - `US-SHER-003` — review shareholder position and activity.
  - Dependencies: G1 treasury readiness, current Investor and Safe Deposit Router contracts, and a funded member wallet.
  - Main path:
    - [ ] Configure supported investment terms.
    - [ ] Invest supported funds through a real transaction.
    - [ ] Verify the Safe receipt and SHER issuance.
    - [ ] Reload and verify balance, ownership percentage, and activity.
  - Expected result: the investment configuration produces a durable shareholder position.
  - Status: planned.

- `E2E-PATH-07` — Issue SHER, distribute dividends, and review the result
  - Stories validated:
    - `US-SHER-004` — issue SHER to a shareholder;
    - `US-SHER-002` — distribute dividends.
  - Reused verification: the shareholder position and activity from `US-SHER-003` are read again, while primary ownership remains in
    `E2E-PATH-06`.
  - Dependencies: an operational company, eligible issuer, funded Bank, and at least one shareholder.
  - Main path:
    - [ ] Issue SHER with the required role and verify the cap table.
    - [ ] Distribute a dividend through the supported authorization path.
    - [ ] Verify proportional receipts and refreshed shareholder activity.
  - Expected result: issuance and distribution are reflected consistently in balances and history.
  - Status: planned.

- `E2E-PATH-08` — Complete a shareholder migration
  - Stories validated:
    - `US-SHER-008` — start a shareholder migration;
    - `US-SHER-006` — claim a migrated shareholding;
    - `US-SHER-007` — settle and close the migration.
  - Dependencies: previous and current Investor generations, migration data, owner, and shareholder wallets.
  - Main path:
    - [ ] Start migration from the previous generation.
    - [ ] Claim the migrated position as the shareholder.
    - [ ] Settle and close the migration as owner.
    - [ ] Verify the final position and history after reload.
  - Expected result: the migrated holding exists once in the current generation and the migration closes cleanly.
  - Status: planned.

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
    - [ ] Inspect the initial Credit Account state.
    - [ ] Publish a credit call and verify the new round on-chain.
    - [ ] Lend to the round and verify balances and participation.
    - [ ] Repay lenders and verify receipts and final balances.
    - [ ] Reload the account and verify the complete round history.
  - Expected result: one credit round is traceable from publication through repayment.
  - Status: planned.

- `E2E-PATH-10` — Recover a stalled credit round
  - Story validated: `US-CC-004` — resolve a stalled round.
  - Reason for isolation: the path deliberately creates an exceptional round state that must not block the normal credit lifecycle.
  - Dependencies: a disposable round created through the real product flow.
  - Main path:
    - [ ] Move the round into a supported stalled state.
    - [ ] Execute the issuer's recovery action.
    - [ ] Verify participant balances, round state, and refreshed history.
  - Expected result: the exceptional round reaches its defined terminal state without corrupting other rounds.
  - Status: planned.

## G5 — Payroll Lifecycle

- `E2E-PATH-11` — Configure and control member compensation
  - Stories validated:
    - `US-PAYROLL-001` — set a member's wage;
    - `US-PAYROLL-002` — pause or resume the wage.
  - Dependencies: an operational company with owner and member.
  - Main path:
    - [ ] Create and then replace the member wage.
    - [ ] Pause and resume it.
    - [ ] Verify the persisted active wage and visible status after reload.
  - Expected result: exactly one current wage controls the member's eligibility.
  - Status: planned.

- `E2E-PATH-12` — Prepare a weekly claim
  - Stories validated:
    - `US-PAYROLL-004` — set weekly goals;
    - `US-PAYROLL-005` — submit a daily claim;
    - `US-PAYROLL-006` — edit a daily claim;
    - `US-PAYROLL-007` — delete a daily claim.
  - Dependencies: an active wage from `E2E-PATH-11`.
  - Main path:
    - [ ] Save weekly goals.
    - [ ] Create, edit, and delete eligible daily work entries.
    - [ ] Recreate the final entry set and verify weekly totals.
  - Expected result: the member reaches a deterministic claim-ready week.
  - Status: planned.

- `E2E-PATH-13` — Approve, reconcile, withdraw, and review payroll
  - Stories validated:
    - `US-PAYROLL-008` — sign a completed weekly claim;
    - `US-PAYROLL-009` — disable or re-enable a signed claim;
    - `US-PAYROLL-010` — withdraw an approved claim;
    - `US-PAYROLL-011` — reconcile claims with the chain;
    - `US-PAYROLL-012` — review payroll history.
  - Reused dependency: `US-PAYROLL-003` references the Accounts-owned funding journey and is not revalidated here.
  - Dependencies: a claim-ready week, current contract owner, and funded Payroll contract.
  - Main path:
    - [ ] Sign the completed weekly claim.
    - [ ] Disable and re-enable it without creating a second claim.
    - [ ] Withdraw through a real chain transaction.
    - [ ] Reconcile backend and chain state.
    - [ ] Verify member and owner histories after reload.
  - Expected result: one claim remains traceable from approval through payment and history.
  - Status: planned.

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
    - [ ] Create and persist a correctly scoped signed approval.
    - [ ] Spend within the approval and verify recipient and contract balances.
    - [ ] Deactivate the approval and verify spending is blocked.
    - [ ] Reactivate it and complete another valid spend.
    - [ ] Reload balances, approval state, and transaction history.
  - Separate variants: overspending, invalid signatures, unauthorized actions, and insufficient funds.
  - Expected result: one allowance remains auditable across its complete active and inactive lifecycle.
  - Status: partial; the main persisted approval, member spend, lifecycle control, balance, and history sequence is executable. Invalid
    signatures, overspending, authorization failures, and insufficient-fund variants remain browser acceptance or lower-layer coverage.
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
    - [ ] Load the complete Accounting journal after the source operations.
    - [ ] Verify every source operation produces one balanced journal entry.
    - [ ] Trace entries to their transactions and concrete company accounts.
    - [ ] Verify the Income Statement, Balance Sheet, and Trial Balance share one balanced snapshot.
    - [ ] Verify historical Officer generations remain separate and complete.
    - [ ] Refresh and verify the same books are reconstructed.
  - Expected result: the company books reconcile with cross-feature persisted and on-chain evidence.
  - Status: planned.

- `E2E-PATH-16` — Classify an external withdrawal and export the reviewed books
  - Stories validated:
    - `US-ACCT-006` — classify an external withdrawal;
    - `US-ACCT-004` — export Accounting reports.
  - Dependencies: reviewed journal and statements from `E2E-PATH-15` and deterministic valuation inputs.
  - Main path:
    - [ ] Classify an unassigned external withdrawal.
    - [ ] Verify the classification persists and updates the affected reports.
    - [ ] Export the selected reports.
    - [ ] Verify exported filters, rows, and totals match the reviewed UI state.
  - Expected result: the reviewed classification and exported books preserve the same accounting snapshot.
  - Status: planned.

## Cross-Group Execution Rules

- Run `E2E-PATH-00` before functional paths, but keep environment preparation outside Playwright.
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
