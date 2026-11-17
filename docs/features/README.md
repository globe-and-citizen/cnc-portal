# Product Feature Catalogue

**Status:** Catalogue with a navigation-derived current-access inventory

**Current-access inventory last verified:** 2026-08-28

The current-access inventory below names the product domains that a user can currently reach in the CNC Portal client or its administrator
dashboard. It is derived from the current navigation, routes, access guards, and linked product actions. The presence of a source directory,
API, contract, or standalone route does not make something a product feature.

Documentation coverage is recorded separately from product access. A missing or legacy document does not mean that the corresponding product
surface is absent, and a document does not prove that the feature has passed human review.

```mermaid
flowchart LR
  user[Authenticated portal user] --> app[Client app]
  admin[Platform administrator] --> backoffice[Backoffice dashboard]

  app --> companies[Companies and workspace]
  app --> profile[Profile]
  app --> accounts[Accounts]
  app --> payroll[Payroll]
  app --> credit[Community Credit]
  app --> accounting[Accounting]
  app --> contracts[Contract Management]
  app --> shareholderManagement[Shareholder Management]
  app --> governance[Governance]
  app --> vesting[Vesting]
  app --> paymentGate[Payment Gate]

  backoffice --> overview[Overview and statistics]
  backoffice --> companies[Companies operations]
  backoffice --> fees[Micropayments]
  backoffice --> polymarket[Polymarket accounting]
  backoffice --> restrictions[Feature restrictions]
  backoffice --> contractOps[Contract operations]
```

<a id="client-features"></a>

## Current Client Modules

The client inventory follows the [Client Navigation implementation](../implementation/client-navigation/README.md) and the authentication
entry journey.

| User capability         | Current entry points                                                    | Documentation coverage                                  |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------- |
| Authentication          | `/login` and wallet session actions                                     | [Canonical stories](./authentication/README.md)         |
| Profile                 | Profile action in the client navigation                                 | [Canonical stories](./user-profile/README.md)           |
| Companies and workspace | `/teams`, `/teams/:id`                                                  | [Canonical stories](./companies/README.md)              |
| Accounts                | Bank, Safe, and Expense Account routes                                  | [Canonical stories](./accounts/README.md)               |
| Payroll                 | Payroll account, history, company payroll, compensation                 | [Canonical stories](./payroll/README.md)                |
| Community Credit        | Rounds, new credit calls, and bookmarkable round views                  | [Canonical stories](./community-credit/README.md)       |
| Accounting              | Summary, income, balance, trial balance, ledger, and account assignment | [Canonical stories](./accounting/README.md)             |
| Contract Management     | `/teams/:id/contract-management`                                        | [Canonical stories](./contract-management/README.md)    |
| Shareholder Management  | `/teams/:id/sher-token`                                                 | [Canonical stories](./shareholder-management/README.md) |
| Board elections         | Board-election overview and election details                            | [Canonical stories](./elections/README.md)              |
| Vesting                 | `/teams/:id/vesting`                                                    | [Canonical stories](./vesting/README.md)                |
| Payment Gate            | `/teams/:id/payment-gate`, `/reference`, `/history`                     | [Canonical stories](./payment-gate/README.md)           |

<a id="backoffice-features"></a>

## Current Backoffice Modules

All administrator-dashboard capabilities are grouped under [`docs/features/backoffice/`](./backoffice/README.md). They are not separate
top-level client modules.

| Administrator capability | Current entry points                        | Documentation coverage                                            |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------- |
| Overview and statistics  | `/`                                         | [Canonical stories](./backoffice/statistics/README.md)            |
| Companies operations     | `/teams`, `/teams/:id`                      | [Canonical stories](./backoffice/companies-operations/README.md)  |
| Micropayments            | `/micropayments`                            | [Canonical stories](./backoffice/micropayments/README.md)         |
| Polymarket accounting    | `/accounting`                               | [Canonical stories](./backoffice/polymarket-accounting/README.md) |
| Feature restrictions     | `/features`, `/features/:id`                | [Canonical stories](./backoffice/feature-restrictions/README.md)  |
| Contract operations      | `/contracts/history`, `/contracts/versions` | [Canonical stories](./backoffice/contract-operations/README.md)   |

## Excluded from the Product Inventory

- Smart-contract packages and contract-specific documentation describe implementation behaviour under `docs/contracts/`; they are not portal
  features by themselves.
- RBAC and runtime wake-up are architectural capabilities under `docs/implementation/`. Database seeding is development tooling. None is a
  direct user goal.
- Login guards, access-denied pages, error pages, and development playgrounds are journey states or tooling, not standalone features.
- Board Proposals is suspended and not in current product planning. Its page, routes, navigation, and contract-write UI are removed. The
  contract artifacts remain available for other contract integrations until a maintained product journey is scheduled again.
- The dashboard's customer, inbox, profile, notification, and member-settings screens still use template or static fixture data. They are
  not CNC Portal features until a real product journey exposes them.
- The dashboard `/contracts` landing page is a placeholder. The implemented history and Officer version-sync journeys are grouped as
  Contract operations.
- The dashboard `/stats` route duplicates the statistics already exposed at `/` but is not linked from the current navigation. It does not
  define another capability.

## Feature Status Legend

- `📝 Draft`: behaviour is being defined.
- `🚧 In Progress`: at least one criterion is incomplete or unverified.
- `🧪 Validation`: all criteria are implemented; human review is pending.
- `✅ Done`: all criteria are implemented and human review passed.
- `🔗 Reference`: the detailed behaviour and validation belong to another story.

These labels mirror the [module story-status contract](../platform/feature-specification-guide.md#story-statuses). They do not indicate the
most recent test run or establish current availability. `Not assessed` in the intended-scope column means the release scope is unknown, not
that the feature is excluded.

## Features

Each row maps an existing user story to a candidate feature in its module. Feature IDs are distinct from their story IDs. The classification
is provisional where a story combines goals; review the actor and outcome before splitting or regrouping it. Reference stories are listed
separately because their behaviour is owned elsewhere. Intended release scope has not been assessed in this catalogue. A story status is
copied from its module, not a new acceptance assessment. Planned and incomplete stories are included even when their module is currently
accessible.

### Accounting

| ID              | Feature / default story                                                                                                 | Intended scope | Status         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-ACCT-001` | [View the Accounting overview](accounting/README.md#feat-acct-001-view-the-accounting-overview)                         | Not assessed   | 🚧 In Progress |
| `FEAT-ACCT-002` | [Trace operations in the General Ledger](accounting/README.md#feat-acct-002-trace-operations-in-the-general-ledger)     | Not assessed   | 🧪 Validation  |
| `FEAT-ACCT-003` | [Review financial statements](accounting/README.md#feat-acct-003-review-financial-statements)                           | Not assessed   | 🧪 Validation  |
| `FEAT-ACCT-004` | [Export accounting reports](accounting/README.md#feat-acct-004-export-accounting-reports)                               | Not assessed   | 🧪 Validation  |
| `FEAT-ACCT-005` | [Review historical contract activity](accounting/README.md#feat-acct-005-review-historical-contract-activity)           | Not assessed   | 🚧 In Progress |
| `FEAT-ACCT-006` | [Classify an external withdrawal](accounting/README.md#feat-acct-006-classify-an-external-withdrawal)                   | Not assessed   | 🧪 Validation  |
| `FEAT-ACCT-007` | [Review direct treasury movements](accounting/README.md#feat-acct-007-review-direct-treasury-movements)                 | Not assessed   | 🚧 In Progress |
| `FEAT-ACCT-008` | [Access synchronized company books](accounting/README.md#feat-acct-008-access-synchronized-company-books)               | Not assessed   | 🚧 In Progress |
| `FEAT-ACCT-009` | [Investigate treasury balance differences](accounting/README.md#feat-acct-009-investigate-treasury-balance-differences) | Not assessed   | 🚧 In Progress |
| `FEAT-ACCT-010` | [Classify direct external receipts](accounting/README.md#feat-acct-010-classify-direct-external-receipts)               | Not assessed   | 🚧 In Progress |

### Accounts

| ID              | Feature / default story                                                                                                  | Intended scope | Status         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------- |
| `FEAT-BANK-001` | [Fund the Bank](accounts/README.md#feat-bank-001-fund-the-bank)                                                          | Not assessed   | 🧪 Validation  |
| `FEAT-BANK-002` | [Transfer Bank funds](accounts/README.md#feat-bank-002-transfer-bank-funds)                                              | Not assessed   | 🧪 Validation  |
| `FEAT-BANK-003` | [Review the Bank position and history](accounts/README.md#feat-bank-003-review-the-bank-position-and-history)            | Not assessed   | 🚧 In Progress |
| `FEAT-BANK-004` | [Cash out available treasury funds](accounts/README.md#feat-bank-004-cash-out-available-treasury-funds)                  | Not assessed   | 🧪 Validation  |
| `FEAT-EXP-001`  | [Grant a signed spending approval](accounts/README.md#feat-exp-001-grant-a-signed-spending-approval)                     | Not assessed   | 🧪 Validation  |
| `FEAT-EXP-002`  | [Spend from the Expense Account](accounts/README.md#feat-exp-002-spend-from-the-expense-account)                         | Not assessed   | 🚧 In Progress |
| `FEAT-EXP-003`  | [Deactivate or reactivate an approval](accounts/README.md#feat-exp-003-deactivate-or-reactivate-an-approval)             | Not assessed   | 🧪 Validation  |
| `FEAT-EXP-004`  | [Review the Expense Account and its history](accounts/README.md#feat-exp-004-review-the-expense-account-and-its-history) | Not assessed   | 🚧 In Progress |
| `FEAT-EXP-005`  | [Fund the Expense Account](accounts/README.md#feat-exp-005-fund-the-expense-account)                                     | Not assessed   | 🚧 In Progress |
| `FEAT-EXP-006`  | [Return Expense Account funds to Bank](accounts/README.md#feat-exp-006-return-expense-account-funds-to-bank)             | Not assessed   | 🚧 In Progress |
| `FEAT-SAFE-001` | [Set up and manage the company Safes](accounts/README.md#feat-safe-001-set-up-and-manage-the-company-safes)              | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-002` | [Inspect Safe details](accounts/README.md#feat-safe-002-inspect-safe-details)                                            | Not assessed   | 🚧 In Progress |
| `FEAT-SAFE-003` | [Manage Safe funds](accounts/README.md#feat-safe-003-manage-safe-funds)                                                  | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-004` | [Manage Safe signers and threshold](accounts/README.md#feat-safe-004-manage-safe-signers-and-threshold)                  | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-005` | [Review Safe transactions](accounts/README.md#feat-safe-005-review-safe-transactions)                                    | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-006` | [Approve and execute a Safe transaction](accounts/README.md#feat-safe-006-approve-and-execute-a-safe-transaction)        | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-007` | [Review the Safe swap P&L](accounts/README.md#feat-safe-007-review-the-safe-swap-pl)                                     | Not assessed   | 🧪 Validation  |
| `FEAT-SAFE-008` | [Review the Safe swaps](accounts/README.md#feat-safe-008-review-the-safe-swaps)                                          | Not assessed   | 🧪 Validation  |

### Authentication

| ID              | Feature / default story                                                                                             | Intended scope | Status         |
| --------------- | ------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-AUTH-001` | [Sign in to the client](authentication/README.md#feat-auth-001-sign-in-to-the-client)                               | Not assessed   | ✅ Done        |
| `FEAT-AUTH-002` | [Sign in to the backoffice](authentication/README.md#feat-auth-002-sign-in-to-the-backoffice)                       | Not assessed   | 🚧 In Progress |
| `FEAT-AUTH-004` | [Resume after a wallet network change](authentication/README.md#feat-auth-004-resume-after-a-wallet-network-change) | Not assessed   | ✅ Done        |

### Community Credit

| ID            | Feature / default story                                                                         | Intended scope | Status         |
| ------------- | ----------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-CC-001` | [Inspect the Credit Account](community-credit/README.md#feat-cc-001-inspect-the-credit-account) | Not assessed   | 🚧 In Progress |
| `FEAT-CC-002` | [Publish a credit call](community-credit/README.md#feat-cc-002-publish-a-credit-call)           | Not assessed   | 🚧 In Progress |
| `FEAT-CC-003` | [Lend to an open round](community-credit/README.md#feat-cc-003-lend-to-an-open-round)           | Not assessed   | 🚧 In Progress |
| `FEAT-CC-004` | [Resolve a stalled round](community-credit/README.md#feat-cc-004-resolve-a-stalled-round)       | Not assessed   | 🧪 Validation  |
| `FEAT-CC-005` | [Repay lenders](community-credit/README.md#feat-cc-005-repay-lenders)                           | Not assessed   | 🚧 In Progress |

### Companies and Workspace

| ID                   | Feature / default story                                                                                                       | Intended scope | Status        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------- |
| `FEAT-COMPANIES-001` | [Create a company workspace](companies/README.md#feat-companies-001-create-a-company-workspace)                               | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-002` | [Deploy the initial Officer contract suite](companies/README.md#feat-companies-002-deploy-the-initial-officer-contract-suite) | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-003` | [Browse and open my companies](companies/README.md#feat-companies-003-browse-and-open-my-companies)                           | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-004` | [Update company details](companies/README.md#feat-companies-004-update-company-details)                                       | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-005` | [Manage company members](companies/README.md#feat-companies-005-manage-company-members)                                       | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-006` | [Archive or restore a company](companies/README.md#feat-companies-006-archive-or-restore-a-company)                           | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-007` | [Control my company-list visibility](companies/README.md#feat-companies-007-control-my-company-list-visibility)               | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-008` | [Permanently delete a company](companies/README.md#feat-companies-008-permanently-delete-a-company)                           | Not assessed   | ✅ Done       |
| `FEAT-COMPANIES-009` | [Pin a company in my lists](companies/README.md#feat-companies-009-pin-a-company-in-my-lists)                                 | Not assessed   | 🧪 Validation |

### Contract Management

| ID                  | Feature / default story                                                                                                  | Intended scope | Status         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------- |
| `FEAT-CONTRACT-001` | [Review the current contract suite](contract-management/README.md#feat-contract-001-review-the-current-contract-suite)   | Not assessed   | 🚧 In Progress |
| `FEAT-CONTRACT-002` | [Manage current contract operations](contract-management/README.md#feat-contract-002-manage-current-contract-operations) | Not assessed   | 🧪 Validation  |
| `FEAT-CONTRACT-003` | [Manage advertising campaigns](contract-management/README.md#feat-contract-003-manage-advertising-campaigns)             | Not assessed   | 🚧 In Progress |
| `FEAT-CONTRACT-004` | [Review deployment history](contract-management/README.md#feat-contract-004-review-deployment-history)                   | Not assessed   | 🚧 In Progress |
| `FEAT-CONTRACT-005` | [Redeploy an Officer generation](contract-management/README.md#feat-contract-005-redeploy-an-officer-generation)         | Not assessed   | 🧪 Validation  |

### Board Elections

| ID            | Feature / default story                                                                                              | Intended scope | Status         |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-EL-001` | [Create a board election](elections/README.md#feat-el-001-create-a-board-election)                                   | Not assessed   | 🧪 Validation  |
| `FEAT-EL-002` | [Cast a vote](elections/README.md#feat-el-002-cast-a-vote)                                                           | Not assessed   | 🚧 In Progress |
| `FEAT-EL-003` | [Publish election results](elections/README.md#feat-el-003-publish-election-results)                                 | Not assessed   | 🚧 In Progress |
| `FEAT-EL-004` | [Receive an election-created notification](elections/README.md#feat-el-004-receive-an-election-created-notification) | Not assessed   | 🚧 In Progress |
| `FEAT-EL-005` | [Follow the election schedule](elections/README.md#feat-el-005-follow-the-election-schedule)                         | Not assessed   | 🧪 Validation  |
| `FEAT-EL-006` | [Follow election turnout and vote counts](elections/README.md#feat-el-006-follow-election-turnout-and-vote-counts)   | Not assessed   | 🧪 Validation  |
| `FEAT-EL-007` | [View the current Board of Directors](elections/README.md#feat-el-007-view-the-current-board-of-directors)           | Not assessed   | 🧪 Validation  |
| `FEAT-EL-008` | [Review a published election](elections/README.md#feat-el-008-review-a-published-election)                           | Not assessed   | 🚧 In Progress |
| `FEAT-EL-009` | [Receive a result-published notification](elections/README.md#feat-el-009-receive-a-result-published-notification)   | Not assessed   | 📝 Draft       |
| `FEAT-EL-010` | [Understand voter eligibility](elections/README.md#feat-el-010-understand-voter-eligibility)                         | Not assessed   | 🚧 In Progress |
| `FEAT-EL-011` | [Cancel an election](elections/README.md#feat-el-011-cancel-an-election)                                             | Not assessed   | 📝 Draft       |

### Payment Gate

| ID                 | Feature / default story                                                                                                   | Intended scope | Status         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-PAYGATE-001` | [Configure the Widget's Accepted Token](payment-gate/README.md#feat-paygate-001-configure-the-widgets-accepted-token)     | Not assessed   | 🧪 Validation  |
| `FEAT-PAYGATE-002` | [Embed the Widget on the Merchant's Page](payment-gate/README.md#feat-paygate-002-embed-the-widget-on-the-merchants-page) | Not assessed   | 🧪 Validation  |
| `FEAT-PAYGATE-003` | [Pay Through the Widget](payment-gate/README.md#feat-paygate-003-pay-through-the-widget)                                  | Not assessed   | 🚧 In Progress |
| `FEAT-PAYGATE-004` | [Review Payment History](payment-gate/README.md#feat-paygate-004-review-payment-history)                                  | Not assessed   | 🧪 Validation  |
| `FEAT-PAYGATE-005` | [Recall a Payment's Status by Facture ID](payment-gate/README.md#feat-paygate-005-recall-a-payments-status-by-facture-id) | Not assessed   | 📝 Draft       |

### Payroll & Cash Remuneration

| ID                 | Feature / default story                                                                                                     | Intended scope | Status         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-PAYROLL-001` | [Set a Member's Wage](payroll/README.md#feat-payroll-001-set-a-members-wage)                                                | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-002` | [Pause or Resume a Member's Wage](payroll/README.md#feat-payroll-002-pause-or-resume-a-members-wage)                        | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-003` | [Fund the Payroll Contract](payroll/README.md#feat-payroll-003-fund-the-payroll-contract)                                   | Not assessed   | 🚧 In Progress |
| `FEAT-PAYROLL-004` | [Set Weekly Goals](payroll/README.md#feat-payroll-004-set-weekly-goals)                                                     | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-005` | [Submit a Daily Claim](payroll/README.md#feat-payroll-005-submit-a-daily-claim)                                             | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-006` | [Edit a Daily Claim](payroll/README.md#feat-payroll-006-edit-a-daily-claim)                                                 | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-007` | [Delete a Daily Claim](payroll/README.md#feat-payroll-007-delete-a-daily-claim)                                             | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-008` | [Sign a Completed Weekly Claim](payroll/README.md#feat-payroll-008-sign-a-completed-weekly-claim)                           | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-009` | [Disable or Re-enable a Signed Weekly Claim](payroll/README.md#feat-payroll-009-disable-or-re-enable-a-signed-weekly-claim) | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-010` | [Withdraw an Approved Weekly Claim](payroll/README.md#feat-payroll-010-withdraw-an-approved-weekly-claim)                   | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-011` | [Reconcile Weekly Claims With the Chain](payroll/README.md#feat-payroll-011-reconcile-weekly-claims-with-the-chain)         | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-012` | [Review Payroll History](payroll/README.md#feat-payroll-012-review-payroll-history)                                         | Not assessed   | 🧪 Validation  |
| `FEAT-PAYROLL-013` | [Review the Payroll Account Position](payroll/README.md#feat-payroll-013-review-the-payroll-account-position)               | Not assessed   | 🚧 In Progress |
| `FEAT-PAYROLL-014` | [Return Payroll funds to Bank](payroll/README.md#feat-payroll-014-return-payroll-funds-to-bank)                             | Not assessed   | 🚧 In Progress |
| `FEAT-PAYROLL-015` | [Require Weekly Goals](payroll/README.md#feat-payroll-015-require-weekly-goals)                                             | Not assessed   | 🧪 Validation  |

### Shareholder Management

| ID              | Feature / default story                                                                                                             | Intended scope | Status         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-SHER-001` | [Invest in the Safe and receive SHER](shareholder-management/README.md#feat-sher-001-invest-in-the-safe-and-receive-sher)           | Not assessed   | 🧪 Validation  |
| `FEAT-SHER-002` | [Distribute dividends to shareholders](shareholder-management/README.md#feat-sher-002-distribute-dividends-to-shareholders)         | Not assessed   | 🧪 Validation  |
| `FEAT-SHER-003` | [Review shareholder position and activity](shareholder-management/README.md#feat-sher-003-review-shareholder-position-and-activity) | Not assessed   | 🚧 In Progress |
| `FEAT-SHER-004` | [Issue SHER to a shareholder](shareholder-management/README.md#feat-sher-004-issue-sher-to-a-shareholder)                           | Not assessed   | 🚧 In Progress |
| `FEAT-SHER-005` | [Configure shareholder investment](shareholder-management/README.md#feat-sher-005-configure-shareholder-investment)                 | Not assessed   | 🧪 Validation  |
| `FEAT-SHER-006` | [Claim a migrated shareholding](shareholder-management/README.md#feat-sher-006-claim-a-migrated-shareholding)                       | Not assessed   | 🧪 Validation  |
| `FEAT-SHER-007` | [Settle and close a shareholder migration](shareholder-management/README.md#feat-sher-007-settle-and-close-a-shareholder-migration) | Not assessed   | 🧪 Validation  |
| `FEAT-SHER-009` | [Manage Investor permissions](shareholder-management/README.md#feat-sher-009-manage-investor-permissions)                           | Not assessed   | 🧪 Validation  |

### Profile

| ID                 | Feature / default story                                                                    | Intended scope | Status        |
| ------------------ | ------------------------------------------------------------------------------------------ | -------------- | ------------- |
| `FEAT-PROFILE-001` | [Update profile identity](user-profile/README.md#feat-profile-001-update-profile-identity) | Not assessed   | 🧪 Validation |

### Vesting

| ID                 | Feature / default story                                                                                                 | Intended scope | Status         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-VESTING-001` | [Create a minute-precise vesting schedule](vesting/README.md#feat-vesting-001-create-a-minute-precise-vesting-schedule) | Not assessed   | ✅ Done        |
| `FEAT-VESTING-002` | [View schedules and aggregate totals](vesting/README.md#feat-vesting-002-view-schedules-and-aggregate-totals)           | Not assessed   | 🚧 In Progress |
| `FEAT-VESTING-003` | [Release accrued shares](vesting/README.md#feat-vesting-003-release-accrued-shares)                                     | Not assessed   | ✅ Done        |
| `FEAT-VESTING-004` | [Stop an active vesting schedule](vesting/README.md#feat-vesting-004-stop-an-active-vesting-schedule)                   | Not assessed   | ✅ Done        |
| `FEAT-VESTING-005` | [Understand vested and claimable progress](vesting/README.md#feat-vesting-005-understand-vested-and-claimable-progress) | Not assessed   | ✅ Done        |

### Backoffice Companies Operations

| ID                  | Feature / default story                                                                                                                              | Intended scope | Status         |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-TEAM-OPS-001` | [Access and inspect platform companies](backoffice/companies-operations/README.md#feat-team-ops-001-access-and-inspect-platform-companies)           | Not assessed   | ✅ Done        |
| `FEAT-TEAM-OPS-002` | [Inspect a company profile](backoffice/companies-operations/README.md#feat-team-ops-002-inspect-a-company-profile)                                   | Not assessed   | ✅ Done        |
| `FEAT-TEAM-OPS-003` | [Investigate Officer contracts and balances](backoffice/companies-operations/README.md#feat-team-ops-003-investigate-officer-contracts-and-balances) | Not assessed   | 🚧 In Progress |

### Backoffice Contract Operations

| ID                      | Feature / default story                                                                                                                             | Intended scope | Status         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-CONTRACT-OPS-001` | [Inspect the contract deployment registry](backoffice/contract-operations/README.md#feat-contract-ops-001-inspect-the-contract-deployment-registry) | Not assessed   | 🧪 Validation  |
| `FEAT-CONTRACT-OPS-002` | [Audit stored Officer-version metadata](backoffice/contract-operations/README.md#feat-contract-ops-002-audit-stored-officer-version-metadata)       | Not assessed   | 🚧 In Progress |
| `FEAT-CONTRACT-OPS-003` | [Synchronize Officer-version metadata](backoffice/contract-operations/README.md#feat-contract-ops-003-synchronize-officer-version-metadata)         | Not assessed   | 🧪 Validation  |

### Feature Restrictions

| ID              | Feature / default story                                                                                              | Intended scope | Status         |
| --------------- | -------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-FLAG-001` | [Manage global restrictions](backoffice/feature-restrictions/README.md#feat-flag-001-manage-global-restrictions)     | Not assessed   | 🧪 Validation  |
| `FEAT-FLAG-002` | [Manage company overrides](backoffice/feature-restrictions/README.md#feat-flag-002-manage-company-overrides)         | Not assessed   | 🚧 In Progress |
| `FEAT-FLAG-003` | [Remove obsolete restrictions](backoffice/feature-restrictions/README.md#feat-flag-003-remove-obsolete-restrictions) | Not assessed   | 🚧 In Progress |

### Backoffice Micropayments

| ID                       | Feature / default story                                                                                                                      | Intended scope | Status         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-MICROPAYMENTS-001` | [Inspect FeeCollector deployments](backoffice/micropayments/README.md#feat-micropayments-001-inspect-feecollector-deployments)               | Not assessed   | 🚧 In Progress |
| `FEAT-MICROPAYMENTS-002` | [Configure V1 FeeCollector fees](backoffice/micropayments/README.md#feat-micropayments-002-configure-v1-feecollector-fees)                   | Not assessed   | 🧪 Validation  |
| `FEAT-MICROPAYMENTS-003` | [Manage V1 FeeCollector token support](backoffice/micropayments/README.md#feat-micropayments-003-manage-v1-feecollector-token-support)       | Not assessed   | 🚧 In Progress |
| `FEAT-MICROPAYMENTS-004` | [Set the V1 FeeCollector fee beneficiary](backoffice/micropayments/README.md#feat-micropayments-004-set-the-v1-feecollector-fee-beneficiary) | Not assessed   | 🧪 Validation  |
| `FEAT-MICROPAYMENTS-005` | [Transfer V1 FeeCollector ownership](backoffice/micropayments/README.md#feat-micropayments-005-transfer-v1-feecollector-ownership)           | Not assessed   | 🧪 Validation  |
| `FEAT-MICROPAYMENTS-006` | [Withdraw V1 FeeCollector funds](backoffice/micropayments/README.md#feat-micropayments-006-withdraw-v1-feecollector-funds)                   | Not assessed   | 🧪 Validation  |
| `FEAT-MICROPAYMENTS-007` | [Manage a legacy FeeCollector deployment](backoffice/micropayments/README.md#feat-micropayments-007-manage-a-legacy-feecollector-deployment) | Not assessed   | 🧪 Validation  |
| `FEAT-MICROPAYMENTS-008` | [Manage the V2 FeeCollector](backoffice/micropayments/README.md#feat-micropayments-008-manage-the-v2-feecollector)                           | Not assessed   | 🚧 In Progress |

### Backoffice Polymarket Accounting

| ID                         | Feature / default story                                                                                                                                      | Intended scope | Status         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | -------------- |
| `FEAT-POLY-ACCOUNTING-001` | [Access and select a public wallet](backoffice/polymarket-accounting/README.md#feat-poly-accounting-001-access-and-select-a-public-wallet)                   | Not assessed   | 🚧 In Progress |
| `FEAT-POLY-ACCOUNTING-002` | [Reconstruct and reconcile a wallet summary](backoffice/polymarket-accounting/README.md#feat-poly-accounting-002-reconstruct-and-reconcile-a-wallet-summary) | Not assessed   | 🚧 In Progress |
| `FEAT-POLY-ACCOUNTING-003` | [Review reconstructed financial statements](backoffice/polymarket-accounting/README.md#feat-poly-accounting-003-review-reconstructed-financial-statements)   | Not assessed   | 🧪 Validation  |
| `FEAT-POLY-ACCOUNTING-004` | [Investigate and export the activity ledger](backoffice/polymarket-accounting/README.md#feat-poly-accounting-004-investigate-and-export-the-activity-ledger) | Not assessed   | 🧪 Validation  |
| `FEAT-POLY-ACCOUNTING-005` | [Inspect Polymarket positions](backoffice/polymarket-accounting/README.md#feat-poly-accounting-005-inspect-polymarket-positions)                             | Not assessed   | 🧪 Validation  |

### Backoffice Statistics

| ID               | Feature / default story                                                                                                           | Intended scope | Status         |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| `FEAT-STATS-001` | [Access administrator statistics](backoffice/statistics/README.md#feat-stats-001-access-administrator-statistics)                 | Not assessed   | 🧪 Validation  |
| `FEAT-STATS-002` | [Review the platform overview and trends](backoffice/statistics/README.md#feat-stats-002-review-the-platform-overview-and-trends) | Not assessed   | 🚧 In Progress |
| `FEAT-STATS-003` | [Explore category statistics](backoffice/statistics/README.md#feat-stats-003-explore-category-statistics)                         | Not assessed   | 🚧 In Progress |
| `FEAT-STATS-004` | [Review recent platform activity](backoffice/statistics/README.md#feat-stats-004-review-recent-platform-activity)                 | Not assessed   | 🚧 In Progress |

## Reference Stories

These stories link to behaviour owned by another feature; they do not introduce a duplicate feature.

| Story            | Reference                                                                                                   | Intended scope | Status       |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | -------------- | ------------ |
| `US-SHER-008`    | [Start a shareholder migration](shareholder-management/README.md#us-sher-008-start-a-shareholder-migration) | Not assessed   | 🔗 Reference |
| `US-VESTING-006` | [See vesting in the company books](vesting/README.md#us-vesting-006-see-vesting-in-the-company-books)       | Not assessed   | 🔗 Reference |

## Updating This Catalogue

Follow the [Feature Documentation Guide](../platform/feature-specification-guide.md#feature-eligibility-and-grouping). Verify product intent
and evidence before changing a capability; verify navigation, routes, guards, and actions when claiming current availability.
