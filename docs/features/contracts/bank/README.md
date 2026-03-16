# Contract: Bank

**Epic Goal:** Hold team treasury funds and distribute dividends proportionally to all shareholders.
**Contract File:** `contracts/Bank.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story  | Title                                                                | Status | Effort |
| ----------- | -------------------------------------------------------------------- | ------ | ------ |
| US-BANK-001 | Deposit ETH into the treasury                                        | ✅     | XS     |
| US-BANK-002 | Deposit ERC20 tokens into the treasury                               | ✅     | S      |
| US-BANK-003 | Transfer ETH to a recipient (with protocol fee)                      | ✅     | M      |
| US-BANK-004 | Transfer ERC20 tokens to a recipient (with fee for supported tokens) | ✅     | M      |
| US-BANK-005 | Distribute ETH dividends to all shareholders                         | ✅     | M      |
| US-BANK-006 | Distribute ERC20 dividends to all shareholders                       | ✅     | M      |
| US-BANK-007 | View ETH and token balances                                          | ✅     | XS     |

**7 / 7 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/Bank.sol`
- **Key functions:** `depositToken`, `transfer`, `transferToken`, `distributeNativeDividends`, `distributeTokenDividends`, `getBalance`, `getTokenBalance`
- **Access roles:** `onlyOwner` for transfers and dividend distribution
- **Dependencies:** Officer (dynamic resolution of InvestorV1 and FeeCollector addresses), InvestorV1 (push-based dividend execution)
- **Pattern:** Push-based dividends — funds go directly to shareholders in the same transaction; no claim pattern

---

## US-BANK-001: Deposit ETH into the Treasury

> **As a** team member, **I want to** send ETH to the Bank, **so that** the team treasury accumulates funds for future use.

**Status:** ✅ | **Priority:** P1 | **Effort:** XS | **Dependencies:** none

### Acceptance Criteria

- [x] `receive()` fallback accepts plain ETH transfers
- [x] No access restriction — any address can fund the treasury
- [x] ETH balance tracked by the EVM natively (no custom accounting needed)
- [x] Contract is not paused at time of deposit (Pausable guard on state-changing calls)

---

## US-BANK-002: Deposit ERC20 Tokens into the Treasury

> **As a** team member, **I want to** deposit ERC20 tokens into the Bank, **so that** the team can hold and distribute non-ETH assets.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `depositToken(token, amount)` transfers `amount` of `token` from the caller to the Bank
- [x] Caller must have pre-approved the Bank to spend `amount` of `token`
- [x] No access restriction — any address can deposit tokens
- [x] `getTokenBalance(token)` reflects the deposited amount after the call

---

## US-BANK-003: Transfer ETH to a Recipient (with Protocol Fee)

> **As a** team owner, **I want to** send ETH from the treasury to any address, **so that** I can pay expenses, salaries, or vendors.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BANK-001

### Acceptance Criteria

- [x] `transfer(to, amount)` restricted to `onlyOwner`
- [x] Protocol fee (basis points from `Officer.getFeeFor("BANK")`) deducted from `amount` and sent to FeeCollector
- [x] Net amount (after fee) sent to `to`
- [x] Reverts if Bank balance is insufficient
- [x] Reverts if contract is paused
- [x] ReentrancyGuard protects against re-entrant calls

---

## US-BANK-004: Transfer ERC20 Tokens to a Recipient (with Fee for Supported Tokens)

> **As a** team owner, **I want to** send ERC20 tokens from the treasury to any address, **so that** I can pay vendors or team members in tokens.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BANK-002

### Acceptance Criteria

- [x] `transferToken(token, to, amount)` restricted to `onlyOwner`
- [x] Fee only charged if `Officer.isFeeCollectorToken(token)` returns true
- [x] Fee amount deducted from `amount` and transferred to FeeCollector
- [x] Net amount transferred to `to`
- [x] Reverts if token balance is insufficient
- [x] Reverts if contract is paused

---

## US-BANK-005: Distribute ETH Dividends to All Shareholders

> **As a** team owner, **I want to** push ETH dividends to every shareholder proportional to their equity, **so that** profit-sharing is settled on-chain immediately.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BANK-001

### Acceptance Criteria

- [x] `distributeNativeDividends(amount)` restricted to `onlyOwner`
- [x] Resolves InvestorV1 address at runtime via `Officer.findDeployedContract("INVESTOR_V1")`
- [x] Calls `InvestorV1.distributeNativeDividends{value: amount}(amount)`
- [x] InvestorV1 pushes proportional ETH to each shareholder in the same transaction
- [x] Last shareholder receives the integer remainder (lossless distribution)
- [x] Reverts if Bank ETH balance < `amount`
- [x] Reverts if contract is paused

---

## US-BANK-006: Distribute ERC20 Dividends to All Shareholders

> **As a** team owner, **I want to** push ERC20 dividends to every shareholder proportional to their equity, **so that** token-denominated profits are distributed on-chain.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-BANK-002

### Acceptance Criteria

- [x] `distributeTokenDividends(token, amount)` restricted to `onlyOwner`
- [x] Bank pre-approves InvestorV1 to spend `amount` of `token`
- [x] Calls `InvestorV1.distributeTokenDividends(token, amount)`
- [x] InvestorV1 pulls tokens from Bank and pushes proportional amounts to each shareholder
- [x] Last shareholder receives the integer remainder (lossless distribution)
- [x] Reverts if Bank token balance < `amount`

---

## US-BANK-007: View ETH and Token Balances

> **As a** team member, **I want to** query the Bank's ETH and ERC20 balances, **so that** I can verify available funds without reading raw blockchain state.

**Status:** ✅ | **Priority:** P3 | **Effort:** XS | **Dependencies:** none

### Acceptance Criteria

- [x] `getBalance()` returns `address(this).balance` in wei
- [x] `getTokenBalance(token)` returns `IERC20(token).balanceOf(address(this))`
- [x] Both functions are `view` (no gas cost when called off-chain)
- [x] No access restriction — readable by anyone

---

_[← Back to index](../README.md)_
