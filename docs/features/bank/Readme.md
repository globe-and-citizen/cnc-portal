# Bank — User Stories

**Format:** User Story | Acceptance Criteria (tester checklist) | Priority (P1–P5) | Effort
(XS/S/M/L/XL) **Last updated:** 2026-08-14

These stories describe the Bank treasury as it is built across the portal and on-chain. Complete the
applicable checklist items to cover the main journeys and edge cases.

### Lifecycle (test in this order)

1. Configure the ERC-20 tokens the Bank can hold.
2. Deposit native currency or a supported ERC-20 token.
3. Transfer treasury funds to an external recipient or a team contract.
4. Distribute native or ERC-20 dividends through Investor.
5. Inspect balances, holdings, and the transaction history.

### Terminology

- **Bank** is the team operating treasury, not a personal wallet.
- A Bank transfer receives a **gross** amount. The configured protocol fee is deducted and the
  recipient receives the net amount.
- Native deposits send value directly to Bank. ERC-20 deposits require a prior allowance, then a
  deposit-token call.
- Funding Payroll or Expense Account from Bank is an internal cash movement, not an expense. See the
  [accounting catalogue](../accounting/money-flow-catalogue.md).

---

## Status Overview

| User Story  | Title                                          | Actor       | Status | Priority | Effort |
| ----------- | ---------------------------------------------- | ----------- | :----: | :------: | ------ |
| US-BANK-001 | Configure supported ERC-20 tokens              | Owner       |   ✅   |    P2    | S      |
| US-BANK-002 | Deposit native currency                        | Any funder  |   ✅   |    P1    | XS     |
| US-BANK-003 | Deposit a supported ERC-20                     | Any funder  |   ✅   |    P1    | S      |
| US-BANK-004 | Transfer native currency from the treasury     | Owner / BoD |   ✅   |    P1    | M      |
| US-BANK-005 | Transfer a supported ERC-20 from the treasury  | Owner / BoD |   ✅   |    P1    | M      |
| US-BANK-006 | Distribute native or ERC-20 dividends          | Owner       |   ✅   |    P1    | M      |
| US-BANK-007 | Fund a fixed-return repayment                  | Owner       |   ✅   |    P2    | M      |
| US-BANK-008 | View treasury holdings and transaction history | Team member |   ✅   |    P2    | S      |

> _(chain)_ criteria are best verified on a deployed test team or through contract tests. _(portal)_
> criteria are observable from the team Bank screen.

---

## US-BANK-001: Configure Supported ERC-20 Tokens

**As a** team owner **I want to** choose supported ERC-20 tokens **so that** treasury movements use
only assets the team has configured.

- [ ] _(chain)_ Only the Bank owner can add or remove a supported token.
- [ ] _(chain)_ Duplicate, unsupported, and zero-address token changes are rejected.
- [ ] _(portal)_ Deposit and transfer forms show their configured token choices; the contract
      remains authoritative.

**Priority:** P2 · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-TEAM-001

---

## US-BANK-002: Deposit Native Currency

**As a** funder **I want to** send native currency to Bank **so that** the team can pay operating
commitments.

- [ ] _(portal)_ The balance card exposes **Deposit** and validates zero, invalid, and over-balance
      amounts before requesting the wallet.
- [ ] _(chain)_ Any address can make a native deposit and an event records it.
- [ ] _(portal)_ A successful deposit closes the modal, reports success, and refreshes holdings.
- [ ] _(portal)_ An archived team cannot submit the action.
- [ ] _(chain)_ Native deposits still work while Bank is paused; its payable receive function is not
      pause-guarded.

**Priority:** P1 · **Effort:** XS · **Status:** ✅ Done · **Dependencies:** US-TEAM-001

---

## US-BANK-003: Deposit a Supported ERC-20

**As a** funder **I want to** deposit a supported ERC-20 **so that** the team has token liquidity.

- [ ] _(portal)_ The ERC-20 flow presents Amount → Approval → Deposit.
- [ ] _(portal)_ It requests an exact allowance only when the existing allowance is insufficient.
- [ ] _(chain)_ The Bank accepts only a supported, non-zero amount, pulls the approved tokens, and
      records the deposit.
- [ ] _(chain)_ Unsupported tokens, zero amounts, and a paused Bank are rejected.
- [ ] _(portal)_ Success refreshes Bank holdings and displays a success toast.

**Priority:** P1 · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-BANK-001

---

## US-BANK-004: Transfer Native Currency from the Treasury

**As a** Bank owner or authorised Board action **I want to** transfer native currency **so that**
the team can fund Payroll, Expense Account, or an external payment.

- [ ] _(portal)_ Transfer is disabled for a zero balance and limited to the owner or an authorised
      Board action.
- [ ] _(portal)_ The form displays the configured fee and targets the entered net recipient amount.
- [ ] _(chain)_ Zero recipient, zero amount, insufficient balance, non-owner caller, and paused Bank
      are rejected.
- [ ] _(chain)_ FeeCollector receives the configured Bank fee and the recipient receives the net
      amount.
- [ ] _(portal)_ A direct transfer refreshes the balance and confirms success; a Board action is
      queued for confirmation instead.

**Priority:** P1 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-BANK-002

---

## US-BANK-005: Transfer a Supported ERC-20 from the Treasury

**As a** Bank owner or authorised Board action **I want to** transfer a supported ERC-20 **so that**
the team can make token-denominated payments.

- [ ] _(portal)_ The form offers available non-SHER Bank token balances.
- [ ] _(chain)_ Transfer requires the owner, supported token, non-zero recipient and amount,
      sufficient balance, and an unpaused Bank.
- [ ] _(chain)_ A fee applies only to tokens marked fee-eligible by Officer.
- [ ] _(portal)_ Successful transfers refresh holdings and classified errors remain visible.

**Priority:** P1 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-BANK-003

---

## US-BANK-006: Distribute Native or ERC-20 Dividends

**As a** team owner **I want to** distribute treasury funds proportionally **so that** profit
sharing settles in one on-chain flow.

- [ ] _(portal)_ The shareholder-token actions expose Bank dividend flows.
- [ ] _(chain)_ Bank resolves the current Investor through Officer at execution time.
- [ ] _(chain)_ Only the owner can distribute; zero amount, insufficient balance, unsupported token,
      missing Investor, and a paused Bank are rejected.
- [ ] _(chain)_ A successful distribution records a dividend-distribution event.

**Priority:** P1 · **Effort:** M · **Status:** ✅ Done · **Dependencies:** US-BANK-002, US-BANK-003

---

## US-BANK-007: Fund a Fixed-Return Repayment

**As a** team owner **I want to** fund an installment from Bank **so that** FixedReturn can settle
the matching lending offer.

- [ ] _(chain)_ The action is owner-only, non-reentrant, and unavailable while Bank is paused.
- [ ] _(chain)_ The offer determines the repayment token; the caller cannot select a different one.
- [ ] _(chain)_ Zero amount, missing FixedReturn, unsupported offer token, and insufficient balance
      are rejected.
- [ ] _(chain)_ Success funds FixedReturn and triggers repayment to lenders.

**Priority:** P2 · **Effort:** M · **Status:** ✅ Done

---

## US-BANK-008: View Treasury Holdings and Transaction History

**As a** team member **I want to** inspect Bank balances and movements **so that** I understand the
team’s available treasury funds.

- [ ] _(portal)_ The page shows total value, token holdings, contract owner, and address.
- [ ] _(chain)_ Native and supported-token balances are readable without a transaction.
- [ ] _(portal)_ History groups events from one transaction and supports filters, pagination, and
      details.
- [ ] _(portal)_ A failed history request is surfaced, not represented as a valid empty result.

**Priority:** P2 · **Effort:** S · **Status:** ✅ Done · **Dependencies:** US-BANK-002

---

## Related Documentation

- [Payroll](../payroll/Readme.md) — the linked wage-claim feature funded from Bank.
- [Expense Account](../expense-account/Readme.md) — signed budgets paid from a separate cash pocket.
- [Accounting money-flow catalogue](../accounting/money-flow-catalogue.md) — funding, fees, and
  journal entries.
