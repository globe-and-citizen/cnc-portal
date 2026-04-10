# Contract: ExpenseAccountEIP712

**Epic Goal:** Allow employees to submit expenses against owner-signed budgets without requiring the owner to be online at submission time.
**Contract File:** `contracts/expense-account/ExpenseAccountEIP712.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                                           | Contract | Frontend | Effort |
| ---------- | ------------------------------------------------------------------------------- | :------: | :------: | ------ |
| US-EXP-001 | Submit an expense with an owner-signed budget (EIP-712)                         | ✅       | 🚫       | L      |
| US-EXP-002 | Enforce budget constraints (amount per transaction, amount per period)          | ✅       | 🚫       | M      |
| US-EXP-003 | Reset budget usage after period expires                                         | ✅       | 🚫       | M      |
| US-EXP-004 | Deactivate / reactivate a budget approval                                       | ✅       | 🚫       | S      |
| US-EXP-005 | Deposit ETH/ERC20 into the expense account                                      | ✅       | 🚫       | S      |
| US-EXP-006 | Support multiple budget period types (one-time, daily, weekly, monthly, custom) | ✅       | 🚫       | M      |

**Contract: 6 / 6 — Frontend: 0 / 6**

---

## Implementation Notes

- **Contract:** `contracts/expense-account/ExpenseAccountEIP712.sol`
- **Key functions:** `submitExpense`, `addTokenSupport`, `removeTokenSupport`
- **Access roles:** Owner signs budgets off-chain; any address holding a valid signature can submit an expense; `onlyOwner` for token support management and deactivation
- **EIP-712:** Domain separator includes contract address and chain ID; typed data struct includes recipient, amount, budget limits, nonce, and period type
- **Budget types:** `TransactionsPerPeriod`, `AmountPerPeriod`, `AmountPerTransaction`
- **Period types:** `OneTime`, `Daily`, `Weekly`, `Monthly`, `Custom`

---

## US-EXP-001: Submit an Expense with an Owner-Signed Budget (EIP-712)

> **As an** employee, **I want to** submit an expense using a budget approval signed by the team owner, **so that** I can get reimbursed without requiring the owner to be online at the moment of payment.

**Status:** ✅ | **Priority:** P1 | **Effort:** L | **Dependencies:** US-EXP-005

### Acceptance Criteria

- [x] `submitExpense(recipient, amount, budgetLimit, signature)` verifies the EIP-712 signature
- [x] Signature recovery confirms the signer is the contract owner
- [x] Budget limits from the signed struct are enforced (see US-EXP-002)
- [x] ETH or ERC20 transferred to `recipient` on success
- [x] Reverts if signature is invalid or budget is exhausted or deactivated
- [x] Reverts if contract is paused

---

## US-EXP-002: Enforce Budget Constraints (Amount per Transaction, Amount per Period)

> **As a** team owner, **I want to** define spend limits in the signed budget, **so that** employees cannot exceed approved amounts.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-EXP-001

### Acceptance Criteria

- [x] `AmountPerTransaction`: single submission must not exceed the limit
- [x] `AmountPerPeriod`: cumulative spend within the current period must not exceed the limit
- [x] `TransactionsPerPeriod`: number of submissions within the current period must not exceed the limit
- [x] Usage tracking stored per budget signature hash
- [x] Reverts with descriptive error if any constraint is violated

---

## US-EXP-003: Reset Budget Usage After Period Expires

> **As a** team owner, **I want to** have period-based budgets automatically reset when the period rolls over, **so that** employees get their full allowance each period without requiring a new signature.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-EXP-002

### Acceptance Criteria

- [x] Each usage record includes the timestamp of the period start
- [x] Before checking limits, the contract computes the current period boundary based on the period type
- [x] If `block.timestamp` is in a new period, usage counters reset to zero
- [x] `OneTime` budgets never reset — signature can only be used within a single cumulative limit
- [x] `Custom` period uses a duration stored in the signed budget struct

---

## US-EXP-004: Deactivate / Reactivate a Budget Approval

> **As a** team owner, **I want to** revoke or re-enable a specific budget signature, **so that** I can stop payments against a compromised or obsolete approval.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-EXP-001

### Acceptance Criteria

- [x] Owner can mark a specific signature hash as inactive
- [x] `submitExpense` reverts if the budget is marked inactive
- [x] Owner can reactivate a previously deactivated budget
- [x] Deactivation is immediate — in-flight transactions with that hash will fail

---

## US-EXP-005: Deposit ETH/ERC20 into the Expense Account

> **As a** team owner, **I want to** fund the expense account with ETH or ERC20 tokens, **so that** approved expenses can be paid out.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `receive()` accepts plain ETH deposits from any address
- [x] `addTokenSupport(token)` whitelists an ERC20 for use in expense submissions (owner only)
- [x] `removeTokenSupport(token)` removes an ERC20 from the whitelist (owner only)
- [x] `submitExpense` reverts if the requested token is not whitelisted
- [x] Balance visible via standard ERC20 `balanceOf` and `address(this).balance`

---

## US-EXP-006: Support Multiple Budget Period Types

> **As a** team owner, **I want to** sign budgets with different period granularities (one-time, daily, weekly, monthly, or custom), **so that** different expense scenarios are covered without deploying additional contracts.

**Status:** ✅ | **Priority:** P2 | **Effort:** M | **Dependencies:** US-EXP-003

### Acceptance Criteria

- [x] `OneTime`: budget usable once (or until cumulative limit hit); never resets
- [x] `Daily`: resets every 24 hours from the first use timestamp
- [x] `Weekly`: resets every 7 days
- [x] `Monthly`: resets every 30 days
- [x] `Custom`: resets every N seconds where N is encoded in the signed budget struct
- [x] Period type encoded in the EIP-712 typed data and verified from the signature

---

_[← Back to index](../README.md)_
