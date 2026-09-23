# Accounts — User Stories

**Scope:** The complete Bank, Safe, Expense Account, and treasury cash-out journey exposed by the portal

**Last reviewed:** Not yet reviewed

These acceptance criteria follow the
[feature documentation review contract](../../platform/feature-specification-guide.md#human-review-contract).

## Product Model

- **Bank** is the company's primary on-chain treasury. Members can inspect it, while the contract owner or the Board of Directors controls
  outgoing transfers.
- **Safe** is an optional shared multi-signature wallet. Company ownership and Safe signer permissions are separate concepts.
- **Expense Account** lets the current contract owner grant signed spending approvals. A recipient spends against the approval without
  receiving custody of the whole account.
- Bank and Expense Account actions use the current contracts selected for the company. Safe actions use the Safe registered to the company
  on the active network.
- A Bank transfer with a positive `BANK` fee sends that fee to the FeeCollector deployed for its contract generation. Native transfers
  assess the configured rate, while ERC-20 transfers are fee-bearing only when the token is supported by that FeeCollector. Activity feeds
  retain fees from every supported Bank generation for Accounting.
- A Bank owner can cash out available treasury funds by first consolidating Cash Remuneration and Expense Account balances into the Bank,
  then moving the Bank's held assets to the connected wallet. A historic generation can instead forward its available funds to the company's
  current Bank.
- Token administration, dividends, payroll, and community-credit repayments are owned by their respective features even when funds move
  through an account.

## Lifecycle

```mermaid
flowchart LR
    Member[Company member opens Accounts] --> Bank[Bank]
    Member --> Safe[Safe]
    Member --> Expense[Expense Account]

    Bank --> FundBank[Fund treasury]
    Bank --> TransferBank[Transfer as owner or propose as Board]
    Bank --> ReviewBank[Review balance and history]
    Bank --> CashOut[Cash out available treasury]
    CashOut --> OwnerWallet[Connected owner wallet]

    Safe --> SetupSafe[Deploy or import]
    SetupSafe --> OperateSafe[Deposit, propose, approve, execute]
    Safe --> ReviewSafe[Review wallet and transactions]

    Expense --> Grant[Owner signs approval]
    Grant --> Spend[Recipient spends within approval]
    Grant --> Manage[Owner deactivates or reactivates]
    Expense --> ReviewExpense[Review balances, approvals, and history]
```

## Status Overview

| User Story  | Title                                      | Actor                      | Status         |
| ----------- | ------------------------------------------ | -------------------------- | -------------- |
| US-BANK-001 | Fund the Bank                              | Company member             | 🧪 Validation  |
| US-BANK-002 | Transfer Bank funds                        | Owner / Board member       | 🧪 Validation  |
| US-BANK-003 | Review the Bank position and history       | Company member             | 🚧 In Progress |
| US-BANK-004 | Cash out available treasury funds          | Bank owner                 | 🧪 Validation  |
| US-EXP-001  | Grant a signed spending approval           | Expense Account owner      | 🧪 Validation  |
| US-EXP-002  | Spend from the Expense Account             | Approved recipient         | 🚧 In Progress |
| US-EXP-003  | Deactivate or reactivate an approval       | Expense Account owner      | 🚧 In Progress |
| US-EXP-004  | Review the Expense Account and its history | Company member / recipient | 🧪 Validation  |
| US-SAFE-001 | Set up a Safe                              | Company owner              | 🧪 Validation  |
| US-SAFE-002 | Inspect Safe details                       | Company member             | 🧪 Validation  |
| US-SAFE-003 | Manage Safe funds                          | Safe owner                 | 🧪 Validation  |
| US-SAFE-004 | Manage Safe signers and threshold          | Safe owner                 | 🧪 Validation  |
| US-SAFE-005 | Review Safe transactions                   | Company member             | 🧪 Validation  |
| US-SAFE-006 | Approve and execute a Safe transaction     | Safe owner                 | 🧪 Validation  |

## Test Coverage Overview

The main treasury and Expense Account journeys use the real frontend, backend, PostgreSQL database, local chain, deployed contracts, and
browser wallet. Fixture-backed account suites remain browser acceptance coverage until their owning actions are migrated.

| User Story  | Representative AC Coverage | E2E Status | E2E Boundary                                             |
| ----------- | -------------------------- | ---------- | -------------------------------------------------------- |
| US-BANK-001 | integrated E2E 3/10        | 🚧 Partial | UI deposits, real transactions, balances, and receipts   |
| US-BANK-002 | none                       | 📋 Planned | Direct and Board-authorized transfer path                |
| US-BANK-003 | integrated E2E 1/8         | 🚧 Partial | Persisted company and chain event history                |
| US-BANK-004 | none                       | 📋 Planned | Complete cash-out orchestration                          |
| US-EXP-001  | integrated E2E 3/10        | 🚧 Partial | Owner signature and backend-persisted approval           |
| US-EXP-002  | integrated E2E 2/12        | 🚧 Partial | Member wallet and real Expense Account transaction       |
| US-EXP-003  | integrated E2E 2/9         | 🚧 Partial | Persisted deactivate/reactivate lifecycle                |
| US-EXP-004  | integrated E2E 2/11        | 🚧 Partial | Live balance, approval state, and chain history          |
| US-SAFE-001 | integrated E2E 2/11        | 🚧 Partial | UI deployment, real Safe proxy, and backend registration |
| US-SAFE-002 | none                       | 📋 Planned | Member inspection on a backend-registered Safe           |
| US-SAFE-003 | none                       | 📋 Planned | Safe funding and transfer proposal lifecycle             |
| US-SAFE-004 | none                       | 📋 Planned | Signer and threshold lifecycle                           |
| US-SAFE-005 | none                       | 📋 Planned | External Transaction Service boundary and UI history     |
| US-SAFE-006 | none                       | 📋 Planned | Multisignature approval and execution                    |

## US-BANK-001: Fund the Bank

**As a** company member\
**I want to** deposit assets into the Bank\
**So that** the company treasury has funds for its operations

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-BANK-001-01` A member can deposit the native token into the Bank.
- [x] `AC-US-BANK-001-02` A member can deposit a supported ERC-20 token into the Bank.
- [x] `AC-US-BANK-001-03` A successful deposit increases the corresponding Bank balance.

#### Business Rules

- [x] `AC-US-BANK-001-04` A deposit amount must be positive and cannot exceed the connected wallet balance.
- [x] `AC-US-BANK-001-05` An ERC-20 deposit can use no more than six decimal places.
- [x] `AC-US-BANK-001-06` The Bank accepts only ERC-20 tokens supported by its current configuration. _(contract)_
- [x] `AC-US-BANK-001-07` An ERC-20 deposit authorizes the Bank only when the existing allowance is insufficient.

#### Edge & Error Cases

- [x] `AC-US-BANK-001-08` An archived company cannot initiate a deposit.
- [x] `AC-US-BANK-001-09` Cancelling or rejecting a deposit leaves the Bank balance unchanged.
- [x] `AC-US-BANK-001-10` A failed deposit leaves the Bank balance unchanged.

**Accounting:** An external receipt is booked by [`UC-BANK-02`](../accounting/journal-entry-catalogue.md#uc-bank-02--external-cash-receipt).
A receipt from another known company pocket is an internal transfer instead.

**Dependencies:** Current Bank contract and a connected wallet

## US-BANK-002: Transfer Bank Funds

**As a** Bank owner or Board member\
**I want to** transfer assets from the Bank\
**So that** the company can use its treasury for authorized payments

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-BANK-002-01` The Bank owner can transfer a held native or supported ERC-20 balance to a valid recipient.
- [x] `AC-US-BANK-002-02` A Board member can submit the same transfer as a Board action for approval.
- [x] `AC-US-BANK-002-03` A successful transfer decreases the Bank balance and delivers the requested net amount to the recipient.

#### Business Rules

- [x] `AC-US-BANK-002-04` Only the Bank owner can execute a direct transfer. _(contract)_
- [x] `AC-US-BANK-002-05` A Board-submitted transfer identifies its approval requirement before submission.
- [x] `AC-US-BANK-002-06` A transfer amount must be positive and cannot exceed the available balance after protocol fees.
- [x] `AC-US-BANK-002-07` A transfer recipient cannot be the zero address. _(contract)_
- [x] `AC-US-BANK-002-08` SHER transfers are not available through the Bank transfer journey.
- [x] `AC-US-BANK-002-09` A native Bank transfer with a positive `BANK` rate pays its calculated fee to its generation's FeeCollector and
      delivers the net amount to the recipient. _(contract)_
- [x] `AC-US-BANK-002-10` An ERC-20 Bank transfer with a positive `BANK` rate pays its calculated fee to its generation's FeeCollector only
      when that token is FeeCollector-supported; otherwise it delivers the full amount to the recipient. _(contract)_

#### Edge & Error Cases

- [x] `AC-US-BANK-002-11` An archived company cannot initiate a transfer or Board action.
- [x] `AC-US-BANK-002-12` A paused Bank rejects outgoing transfers. _(contract)_
- [x] `AC-US-BANK-002-13` Cancelling, rejecting, or failing a transfer leaves the Bank balance unchanged.

**Accounting:** The destination determines the rule: company-pocket funding uses
[`UC-BANK-03`](../accounting/journal-entry-catalogue.md#uc-bank-03--bank-funds-a-company-pocket), an external payment uses
[`CASH-OUT`](../accounting/journal-entry-catalogue.md#cash-out--external-bank-or-safe-payment), and any matched protocol fee is attached
through [`FEE`](../accounting/journal-entry-catalogue.md#fee--transaction-fee-component).

**Dependencies:** US-BANK-001 and the Board action capability for non-owner proposals

## US-BANK-003: Review the Bank Position and History

**As a** company member\
**I want to** inspect the Bank's holdings and activity\
**So that** I can understand the company's treasury position

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-BANK-003-01` A company member can inspect the Bank address, native balance, token holdings, and local-currency value.
- [x] `AC-US-BANK-003-02` Bank history exposes each transaction's date, type, counterparty, value, and transaction hash when available.
- [x] `AC-US-BANK-003-03` A company member can filter Bank history by date and transaction type.

#### Business Rules

- [x] `AC-US-BANK-003-04` Every company member can inspect Bank balances and history regardless of transfer permission.
- [x] `AC-US-BANK-003-05` Grouped events from one transaction remain attributable to the same transaction hash.
- [x] `AC-US-BANK-003-06` Bank history surfaces money that arrives at or leaves the Bank by a direct token transfer, even when the Bank
      emitted no event of its own — for example, the funds swept in when a Community Credit round is funded. A movement a Bank event already
      records is not shown a second time.

#### Edge & Error Cases

- [x] `AC-US-BANK-003-07` A history filter with no matching events returns an empty result.
- [ ] `AC-US-BANK-003-08` A failed history read is distinguishable from a successfully loaded empty history.

**Dependencies:** Current Bank contract and an available chain event provider

## US-BANK-004: Cash Out Available Treasury Funds

**As a** Bank owner\
**I want to** cash out the company's available treasury funds\
**So that** I can move them to my connected wallet or the company's current Bank

### How It Works

1. The owner reviews the funded accounts and the destination before confirming the run.
2. When available, Cash Remuneration and Expense Account funds move into their generation's Bank first.
3. The Bank then forwards its native and supported token balances to the destination. A historic generation forwards its available funds to
   the company's current Bank.

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-BANK-004-01` The Bank owner can consolidate available Cash Remuneration and Expense Account funds into the current Bank, then
      transfer each held native or supported ERC-20 asset to the connected wallet.
- [x] `AC-US-BANK-004-02` The owner of a historic contract generation can forward its available Bank funds to the company's current Bank,
      including eligible source-account sweeps.

#### Business Rules

- [x] `AC-US-BANK-004-03` Only the relevant Bank owner can start a cash-out run, and an archived current company cannot start one.
- [x] `AC-US-BANK-004-04` Each Bank transfer reads balances after the source-account steps, so zero-balance assets do not create
      transactions.
- [x] `AC-US-BANK-004-05` Historic generations without source-account withdrawal support can transfer only their Bank balance and identify
      the funds that remain in their source accounts.

#### Edge & Error Cases

- [x] `AC-US-BANK-004-06` A failed step stops the sequence, leaves later steps pending, and lets the owner retry from the failed step.
- [x] `AC-US-BANK-004-07` Rejecting a wallet request leaves the remaining steps unrun and identifies the rejected step to the owner.
- [x] `AC-US-BANK-004-08` A cash-out run does not start when no eligible funded account is available.

**Accounting:** Source-account sweeps are [`INTERNAL`](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer).
The final wallet payment is [`CASH-OUT`](../accounting/journal-entry-catalogue.md#cash-out--external-bank-or-safe-payment) with any matched
[`FEE`](../accounting/journal-entry-catalogue.md#fee--transaction-fee-component).

**Dependencies:** US-BANK-001, US-BANK-002, and the current Cash Remuneration and Expense Account contracts

## US-EXP-001: Grant a Signed Spending Approval

**As an** Expense Account owner\
**I want to** grant a member a signed spending approval\
**So that** they can pay authorized expenses without controlling the whole account

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EXP-001-01` The current Expense Account owner can grant a spending approval to a recipient.
- [x] `AC-US-EXP-001-02` A valid approval records its recipient, token, amount, schedule, expiry, and signature domain.
- [x] `AC-US-EXP-001-03` A successfully granted approval becomes available to its recipient and the company.

#### Business Rules

- [x] `AC-US-EXP-001-04` Only the current Expense Account owner can create a valid approval.
- [x] `AC-US-EXP-001-05` An approval is bound to the current Expense Account contract and active network.
- [x] `AC-US-EXP-001-06` The persisted approval signer must recover to the connected owner. _(API)_
- [x] `AC-US-EXP-001-07` The signed Expense Account must match the company's current Expense Account. _(API)_

#### Edge & Error Cases

- [x] `AC-US-EXP-001-08` An archived company cannot grant a spending approval.
- [x] `AC-US-EXP-001-09` An invalid or mismatched signature is rejected without creating an approval.
- [x] `AC-US-EXP-001-10` Cancelling or rejecting the signature leaves the recipient's approvals unchanged.

**Accounting:** Creating an approval moves no money and creates no journal entry. A later spend owns the accounting operation.

**Dependencies:** Current Expense Account contract and connected contract owner

## US-EXP-002: Spend From the Expense Account

**As an** approved recipient\
**I want to** spend within my approval\
**So that** I can pay an authorized expense from the company's funds

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EXP-002-01` An approved recipient can transfer the authorized token to a valid destination.
- [x] `AC-US-EXP-002-02` A successful spend decreases both the available approval amount and the Expense Account balance.
- [x] `AC-US-EXP-002-03` A recurring approval remains available while it has remaining allowance in its active period.

#### Business Rules

- [x] `AC-US-EXP-002-04` A spend cannot exceed the lower of the approval remainder and the Expense Account balance.
- [x] `AC-US-EXP-002-05` A spend must use the approval's recipient, token, contract, network, and recovered owner signature.
- [x] `AC-US-EXP-002-06` A one-time approval cannot be spent more than once. _(contract)_
- [ ] `AC-US-EXP-002-07` Every ERC-20 spend, including a one-time approval, requires a supported token. _(contract)_

#### Edge & Error Cases

- [x] `AC-US-EXP-002-08` An archived company cannot initiate a spend.
- [ ] `AC-US-EXP-002-09` A paused Expense Account rejects spending. _(contract)_
- [x] `AC-US-EXP-002-10` An expired or exhausted approval rejects spending.
- [x] `AC-US-EXP-002-11` A mismatched or unverifiable approval rejects spending without changing balances.
- [x] `AC-US-EXP-002-12` A failed balance read prevents spending until the available amount can be verified.

**Accounting:** An external payout is booked by [`UC-EXP-01`](../accounting/journal-entry-catalogue.md#uc-exp-01--approved-expense-payout);
a transfer to another known company pocket is
[`INTERNAL`](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer).

**Dependencies:** US-EXP-001 and a funded Expense Account

## US-EXP-003: Deactivate or Reactivate an Approval

**As an** Expense Account owner\
**I want to** deactivate or reactivate a spending approval\
**So that** I can control whether the recipient may continue spending

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EXP-003-01` The current Expense Account owner can deactivate an enabled approval.
- [x] `AC-US-EXP-003-02` The current Expense Account owner can reactivate a disabled approval.
- [x] `AC-US-EXP-003-03` A successful state change is reflected in the company and recipient approval records.

#### Business Rules

- [x] `AC-US-EXP-003-04` Only the current Expense Account owner can change an approval's active state.
- [ ] `AC-US-EXP-003-05` A deactivated approval cannot authorize a spend. _(contract)_
- [x] `AC-US-EXP-003-06` Reactivation preserves the approval's original signed limits and expiry.

#### Edge & Error Cases

- [x] `AC-US-EXP-003-07` An archived company cannot deactivate or reactivate an approval.
- [x] `AC-US-EXP-003-08` A failed state change preserves the approval's prior reported state.
- [x] `AC-US-EXP-003-09` Expired and exhausted approvals remain unavailable after state synchronization.

**Accounting:** Changing an approval's active state moves no money and creates no journal entry.

**Dependencies:** US-EXP-001

## US-EXP-004: Review the Expense Account and Its History

**As a** company member or approved recipient\
**I want to** inspect Expense Account funds, approvals, and activity\
**So that** I understand what can be spent and what has already happened

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-EXP-004-01` A company member can inspect the Expense Account address, balances, monthly spend, and approved total.
- [x] `AC-US-EXP-004-02` A recipient can inspect approvals granted to their connected wallet.
- [x] `AC-US-EXP-004-03` A company member can inspect company approvals and their current enabled, disabled, expired, or exhausted state.
- [x] `AC-US-EXP-004-04` Expense history exposes transaction dates, types, counterparties, values, and transaction hashes when available.
- [x] `AC-US-EXP-004-05` A company member can filter Expense history by date and transaction type.

#### Business Rules

- [x] `AC-US-EXP-004-06` Approval availability reflects on-chain usage, current time, and active-state synchronization.
- [x] `AC-US-EXP-004-07` One recipient sees only approvals issued to their connected wallet in their personal approval scope.
- [x] `AC-US-EXP-004-08` Every company member can inspect the shared Expense Account history.

#### Edge & Error Cases

- [x] `AC-US-EXP-004-09` A scope with no approvals or transactions returns an empty result.
- [x] `AC-US-EXP-004-10` A failed approval read is distinguishable from a successfully loaded empty approval scope.
- [x] `AC-US-EXP-004-11` A failed transaction read is distinguishable from a successfully loaded empty history.

**Dependencies:** Current Expense Account contract and available API and chain providers

## US-SAFE-001: Set Up a Safe

**As a** company owner\
**I want to** deploy a new Safe or import an existing Safe\
**So that** my company has a shared multi-signature wallet in CNC

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-001-01` A company without a registered Safe can deploy a new Safe.
- [x] `AC-US-SAFE-001-02` A company without a registered Safe can import an existing Safe from the active network.
- [x] `AC-US-SAFE-001-03` A newly deployed or imported Safe is registered to the company.

#### Business Rules

- [x] `AC-US-SAFE-001-04` Only the company owner can deploy, import, or register a Safe for the company.
- [x] `AC-US-SAFE-001-05` A newly deployed Safe starts with the company owner as its only signer and a threshold of one.
- [x] `AC-US-SAFE-001-06` Importing a Safe preserves its owners, threshold, assets, and on-chain configuration.
- [x] `AC-US-SAFE-001-07` An imported address must resolve to a Safe on the active network before registration.
- [x] `AC-US-SAFE-001-08` Every valid registered Safe address is checksum-normalized before routing, reads, writes, SDK initialization, or
      transaction-service requests.

#### Edge & Error Cases

- [x] `AC-US-SAFE-001-09` The company owner can continue company creation without setting up a Safe.
- [x] `AC-US-SAFE-001-10` If registration fails after deployment, the deployed Safe remains available for a registration retry.
- [x] `AC-US-SAFE-001-11` An archived company cannot deploy, import, or retry Safe registration.

**Dependencies:** Current company and active network

## US-SAFE-002: Inspect Safe Details

**As a** company member\
**I want to** inspect the Safe's current details\
**So that** I understand the shared wallet and who controls it

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-002-01` A company member can inspect the Safe address, balances, token holdings, owners, and signature threshold.
- [x] `AC-US-SAFE-002-02` A company member can inspect incoming native-token, ERC-20, and ERC-721 transfers.
- [x] `AC-US-SAFE-002-03` Safe information refreshes after an account action succeeds.

#### Business Rules

- [x] `AC-US-SAFE-002-04` Inspecting Safe details does not require Safe signer permission.
- [x] `AC-US-SAFE-002-05` The registered Safe address identifies the wallet whose balances, owners, and threshold are reported.

#### Edge & Error Cases

- [x] `AC-US-SAFE-002-06` A Safe with no incoming transfers returns an empty deposit history.
- [x] `AC-US-SAFE-002-07` A failed Safe information read is reported without hiding unaffected Safe information.
- [x] `AC-US-SAFE-002-08` A failed Safe information read can be retried without registering another Safe.

**Dependencies:** US-SAFE-001

## US-SAFE-003: Manage Safe Funds

**As a** Safe owner\
**I want to** deposit and transfer assets through the Safe\
**So that** the company can fund and use its shared treasury

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-003-01` A user can deposit the native token or a supported token into the Safe.
- [x] `AC-US-SAFE-003-02` A Safe owner can propose a transfer of an asset held by the Safe.
- [x] `AC-US-SAFE-003-03` A completed transfer refreshes the Safe balances and transaction state.

#### Business Rules

- [x] `AC-US-SAFE-003-04` Only a current Safe owner can propose an outgoing Safe transfer.
- [x] `AC-US-SAFE-003-05` Company membership alone does not grant Safe signer permission.
- [x] `AC-US-SAFE-003-06` An outgoing transfer follows the Safe's current approval threshold.

#### Edge & Error Cases

- [x] `AC-US-SAFE-003-07` A proposal below the approval threshold remains pending without moving funds.
- [x] `AC-US-SAFE-003-08` A rejected or failed proposal leaves Safe balances unchanged.
- [x] `AC-US-SAFE-003-09` An archived company cannot initiate a Safe deposit or transfer.

**Accounting:** A confirmed transfer is classified as
[`UC-BANK-02`](../accounting/journal-entry-catalogue.md#uc-bank-02--external-cash-receipt),
[`CASH-OUT`](../accounting/journal-entry-catalogue.md#cash-out--external-bank-or-safe-payment), or
[`INTERNAL`](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer) from its counterparty evidence.

**Dependencies:** US-SAFE-001 and US-SAFE-006

## US-SAFE-004: Manage Safe Signers and Threshold

**As a** Safe owner\
**I want to** change the Safe's signers and approval threshold\
**So that** its control rules match the company's current governance

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-004-01` A Safe owner can propose adding a signer.
- [x] `AC-US-SAFE-004-02` A Safe owner can propose removing a signer.
- [x] `AC-US-SAFE-004-03` A Safe owner can propose changing the approval threshold.
- [x] `AC-US-SAFE-004-04` A completed change refreshes the reported owners and threshold.

#### Business Rules

- [x] `AC-US-SAFE-004-05` Only a current Safe owner can propose signer or threshold changes.
- [x] `AC-US-SAFE-004-06` Signer and threshold changes follow the Safe's current approval threshold.
- [x] `AC-US-SAFE-004-07` A signer change cannot leave the Safe with an invalid threshold.

#### Edge & Error Cases

- [x] `AC-US-SAFE-004-08` A user without Safe signer permission cannot propose a control change.
- [x] `AC-US-SAFE-004-09` A rejected or failed change preserves the current signers and threshold.

**Dependencies:** US-SAFE-006

## US-SAFE-005: Review Safe Transactions

**As a** company member\
**I want to** review Safe transactions\
**So that** I understand pending and completed company actions

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-005-01` Safe transactions expose their action, recipient, value, approval progress, status, and last update.
- [x] `AC-US-SAFE-005-02` A company member can inspect transaction details and the on-chain hash when available.
- [x] `AC-US-SAFE-005-03` A company member can filter transactions by approval, execution, conflict, and completion state.

#### Business Rules

- [x] `AC-US-SAFE-005-04` Reviewing transaction details does not require Safe signer permission.
- [x] `AC-US-SAFE-005-05` Pending approval, ready to execute, conflicting, executed, and invalid transactions remain distinct states.
- [x] `AC-US-SAFE-005-06` The available next action is derived from the transaction state and the connected signer's approvals.

#### Edge & Error Cases

- [x] `AC-US-SAFE-005-07` A Safe with no matching transactions returns an empty result.
- [x] `AC-US-SAFE-005-08` A failed transaction read is distinguishable from a successfully loaded empty result.
- [x] `AC-US-SAFE-005-09` A failed transaction read can be retried without hiding unaffected Safe information.

**Dependencies:** US-SAFE-001

## US-SAFE-006: Approve and Execute a Safe Transaction

**As a** Safe owner\
**I want to** approve and execute a Safe transaction\
**So that** the company can carry out an action after enough signers agree

### Acceptance Criteria

#### Happy Path

- [x] `AC-US-SAFE-006-01` A Safe owner can approve a pending transaction they have not already approved.
- [x] `AC-US-SAFE-006-02` A Safe owner can execute a transaction after it reaches the required threshold.
- [x] `AC-US-SAFE-006-03` Execution refreshes the transaction state and affected Safe information.

#### Business Rules

- [x] `AC-US-SAFE-006-04` Only current Safe owners can approve or execute a Safe transaction.
- [x] `AC-US-SAFE-006-05` One signer cannot approve the same transaction twice.
- [x] `AC-US-SAFE-006-06` Approval and execution remain separate actions after the threshold is reached.
- [x] `AC-US-SAFE-006-07` Executed and stale-nonce transactions cannot be approved or executed again.

#### Edge & Error Cases

- [x] `AC-US-SAFE-006-08` Before approving a threshold-reaching transaction or executing a transaction while another valid transaction is
      pending, the Safe owner sees a warning that names the pending action and can cancel or continue.
- [x] `AC-US-SAFE-006-09` A rejected or failed approval does not increase the approval count.
- [x] `AC-US-SAFE-006-10` A rejected or failed execution leaves the transaction unexecuted.

**Dependencies:** US-SAFE-001

## Known Gaps

- Bank history does not distinguish a failed event read from a successfully loaded empty history (`US-BANK-003`).
- A one-time Expense approval can spend an unsupported ERC-20 token held by the contract (`US-EXP-002`).
- Pausing the Expense Account does not prevent spending (`US-EXP-002`).
- Deactivating an Expense approval changes its recorded state but does not prevent that signature from authorizing a spend (`US-EXP-003`).

## Implementation Evidence

**Implementation evidence reviewed against:** `80b1215080fa2310037d90492cfb4bd06f53e23f`

- [Bank components](../../../app/src/components/sections/BankView/),
  [Expense Account components](../../../app/src/components/sections/ExpenseAccountView/),
  [Safe components](../../../app/src/components/sections/SafeView/), and
  [owner treasury withdrawal](../../../app/src/components/sections/OwnerTreasuryWithdrawAction.vue)
- [Token amount input](../../../app/src/components/ui/inputs/TokenAmountInput.vue) and
  [Safe transaction send orchestration](../../../app/src/composables/transactions/useSafeSendTransaction.ts)
- [Accounts routes](../../../app/src/router/index.ts) and [Accounts navigation](../../../app/src/composables/useSidebarNavItems.ts). The
  Community Credit round-detail view parameter does not alter Accounts entry points.
- [Bank page](../../../app/src/views/team/%5Bid%5D/Accounts/BankView.vue), [Bank writes](../../../app/src/composables/bank/writes.ts),
  [Bank transaction feed](../../../app/src/composables/bank/useBankEventsViaLogs.ts),
  [version-aware Bank fee normalization](../../../app/src/composables/bank/bankFees.ts),
  [incoming Bank transfer feed](../../../app/src/composables/bank/useIncomingBankTokenTransfersViaLogs.ts), and
  [Bank contract](../../../contract/contracts/Bank.sol)
- [Bank component tests](../../../app/src/components/sections/BankView/__tests__) and
  [Bank contract tests](../../../contract/test/Bank.spec.ts)
- [Bank transfer form](../../../app/src/components/forms/TransferForm.vue)
- [Current treasury cash-out action](../../../app/src/components/sections/DashboardView/CashOutAllAction.vue),
  [historic-generation withdrawal action](../../../app/src/components/sections/ContractManagementView/LegacyGenerationWithdrawAction.vue),
  and [cash-out orchestration](../../../app/src/composables/cashOut/useCashOutAll.ts)
- [Cash-out composable tests](../../../app/src/composables/cashOut/__tests__/useCashOutAll.spec.ts),
  [current-treasury action tests](../../../app/src/components/sections/DashboardView/__tests__/CashOutAllAction.spec.ts), and
  [historic-generation action tests](../../../app/src/components/sections/ContractManagementView/__tests__/LegacyGenerationWithdrawAction.spec.ts)
- [Safe page](../../../app/src/views/team/%5Bid%5D/Accounts/SafeView.vue),
  [Safe deposit form](../../../app/src/components/sections/SafeView/forms/DepositSafeForm.vue),
  [Safe composables](../../../app/src/composables/safe/), [Safe address normalization](../../../app/src/utils/safe/address.ts),
  [Safe transaction helpers](../../../app/src/lib/safe/transactions.ts), and
  [Safe transaction state](../../../app/src/utils/safe/transactionState.ts)
- [Safe transaction queue](../../../app/src/components/sections/SafeView/SafeTransactions.vue),
  [Safe transaction table](../../../app/src/components/sections/SafeView/SafeTransactionsTable.vue), and
  [Safe mobile transaction list](../../../app/src/components/sections/SafeView/SafeTransactionMobileList.vue),
  [Safe queries and cache keys](../../../app/src/queries/safe.queries.ts),
  [Safe transaction mutations](../../../app/src/queries/safe.mutations.ts),
  [Safe transaction state and conflict rules](../../../app/src/utils/safe/transactionState.ts), and
  [Safe conflict warning](../../../app/src/components/sections/SafeView/SafeTransactionsWarning.vue)
- [Safe component tests](../../../app/src/components/sections/SafeView/__tests__) and
  [Safe composable tests](../../../app/src/composables/safe/__tests__)
- [Safe transaction queue tests](../../../app/src/components/sections/SafeView/__tests__/SafeTransactions.spec.ts),
  [Safe address normalization tests](../../../app/src/utils/safe/__tests__/address.spec.ts),
  [Safe proposal tests](../../../app/src/lib/safe/__tests__/transactions.spec.ts),
  [Safe transaction state tests](../../../app/src/utils/safe/__tests__/transactionState.spec.ts), and
  [Safe conflict warning tests](../../../app/src/components/sections/SafeView/__tests__/SafeTransactionsWarning.spec.ts)
- [Expense Account page](../../../app/src/views/team/%5Bid%5D/Accounts/ExpenseAccountView.vue),
  [expense approval form](../../../app/src/components/sections/ExpenseAccountView/forms/ApproveUsersEIP712Form.vue),
  [member and token selector](../../../app/src/components/ui/inputs/SelectMemberWithTokenInput.vue),
  [Expense API controller](../../../backend/src/controllers/expenseController.ts), and
  [Expense Account contract](../../../contract/contracts/expense-account/ExpenseAccountEIP712.sol)
- [Expense component tests](../../../app/src/components/sections/ExpenseAccountView/__tests__),
  [Expense API tests](../../../backend/src/controllers/__tests__/expenseController.test.ts), and
  [Expense contract tests](../../../contract/test/ExpenseAccountEIP712.spec.ts)
- [Cash Remuneration account page](../../../app/src/views/team/%5Bid%5D/Accounts/CashRemunerationView.vue)

### Test-suite ownership

- [Bank composable tests](../../../app/src/composables/bank/__tests__/), [cash-out tests](../../../app/src/composables/cashOut/__tests__/),
  and [ERC-20 composable tests](../../../app/src/composables/erc20/__tests__/)
- [Transfer-form tests](../../../app/src/components/forms/__tests__/TransferForm.spec.ts),
  [company-creation Safe setup tests](../../../app/src/components/sections/TeamView/forms/__tests__/AddTeamForm.safe-setup.spec.ts),
  [owner-withdrawal tests](../../../app/src/components/sections/__tests__/OwnerTreasuryWithdrawAction.spec.ts),
  [Safe account view tests](../../../app/src/views/team/%5Bid%5D/Accounts/__tests__/), and
  [Bank view tests](../../../app/src/views/team/%5Bid%5D/__tests__/BankView.spec.ts)
- [Safe type tests](../../../app/src/types/__tests__/safe.spec.ts),
  [Safe schema tests](../../../app/src/types/__tests__/safe.schemas.spec.ts), and
  [Safe infrastructure constants](../../../app/src/constant/__tests__/safeInfra.test.ts)
- [Address presentation tests](../../../app/src/components/ui/__tests__/AddressTooltip.spec.ts),
  [token holdings tests](../../../app/src/components/ui/__tests__/TokenHoldingsSection.spec.ts),
  [member-token selector tests](../../../app/src/components/ui/inputs/__tests__/SelectMemberWithTokenInput.spec.ts), and
  [token amount tests](../../../app/src/components/ui/inputs/__tests__/TokenAmountInput.spec.ts)
- [Contract-balance tests](../../../app/src/composables/__tests__/useContractBalance.spec.ts),
  [token-balance tests](../../../app/src/lib/balances/__tests__/tokenBalances.spec.ts), and
  [Safe browser-boundary tests](../../../app/src/lib/safe/__tests__/browser.spec.ts)
- [Expense validation tests](../../../backend/src/validation/schemas/__tests__/expense.test.ts)
- [Bank beacon tests](../../../contract/test/BankBeacon.spec.ts), [Bank upgrade tests](../../../contract/test/BankUpgradeModule.spec.ts),
  [Expense calendar-period tests](../../../contract/test/ExpenseAccountEIP712V2.calendarBasedPeriods.spec.ts),
  [Expense custom-frequency tests](../../../contract/test/ExpenseAccountEIP712V2.customFrequency.spec.ts), and
  [Expense period-boundary tests](../../../contract/test/ExpenseAccountEIP712V2.isNewPeriod.spec.ts)

## Related Documentation

- [Client Navigation implementation](../../implementation/client-navigation/README.md)
- [Date Picker implementation](../../implementation/date-picker/README.md)
- [Transaction History implementation](../../implementation/transaction-history/README.md)
- [Bank contract](../../contracts/features/bank/README.md)
- [Expense Account contract](../../contracts/features/expense-account/README.md)
- [Safe Deposit Router contract](../../contracts/features/safe-deposit-router/README.md)
- [Backoffice Micropayments](../backoffice/micropayments/README.md)
- [Accounting](../accounting/README.md)
- [Payroll & Cash Remuneration](../payroll/README.md)
- [Community Credit](../community-credit/README.md)

_[← Back to feature inventory](../README.md)_
