# Contract: InvestorV1

**Epic Goal:** Issue equity tokens to shareholders and execute push-based dividend distributions.
**Contract File:** `contracts/Investor/InvestorV1.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                                | Status | Effort |
| ---------- | -------------------------------------------------------------------- | ------ | ------ |
| US-INV-001 | Bulk mint equity tokens to shareholders (distributeMint)             | ✅     | M      |
| US-INV-002 | Mint equity tokens to an individual (individualMint via MINTER_ROLE) | ✅     | S      |
| US-INV-003 | Automatically track shareholders on token transfer                   | ✅     | M      |
| US-INV-004 | Receive and push ETH dividends to all shareholders                   | ✅     | M      |
| US-INV-005 | Receive and push ERC20 dividends to all shareholders                 | ✅     | M      |
| US-INV-006 | View current shareholder list with balances                          | ✅     | XS     |

**6 / 6 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/Investor/InvestorV1.sol`
- **Key functions:** `distributeMint`, `individualMint`, `getShareholders`, `distributeNativeDividends`, `distributeTokenDividends`
- **Access roles:** `onlyOwner` for `distributeMint`; `MINTER_ROLE` for `individualMint`; `onlyBank` for dividend distribution
- **Dependencies:** Officer (runtime Bank address resolution for `onlyBank` modifier), MINTER_ROLE granted to CashRemunerationEIP712
- **Token:** ERC20, 6 decimals (USDC-style precision)
- **Pattern:** Shareholder set maintained automatically via `_update` hook on every ERC20 transfer; lossless distribution (last shareholder gets remainder)

---

## US-INV-001: Bulk Mint Equity Tokens to Shareholders

> **As a** team owner, **I want to** mint equity tokens to a list of shareholders in one call, **so that** initial equity distribution is done efficiently.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `distributeMint(shareholders[])` accepts an array of `{ addr, amount }` entries
- [x] Only callable by the contract owner
- [x] Mints `amount` tokens to each `addr` in the array
- [x] Each recipient is added to the shareholder set on mint (via `_update` hook)
- [x] Reverts if any recipient is the zero address

---

## US-INV-002: Mint Equity Tokens to an Individual (individualMint via MINTER_ROLE)

> **As a** compensation contract (CashRemuneration), **I want to** mint equity tokens to a single employee as part of their wage, **so that** equity compensation is settled on-chain automatically.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `individualMint(shareholder, amount)` mints tokens to a single address
- [x] Restricted to `MINTER_ROLE` (granted to CashRemunerationEIP712 at deployment)
- [x] Recipient added to shareholder set on mint
- [x] Reverts if `shareholder` is the zero address

---

## US-INV-003: Automatically Track Shareholders on Token Transfer

> **As a** system, **I want to** maintain an up-to-date shareholder list on every token transfer, **so that** dividend calculations always reflect current equity ownership.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `_update` hook overrides ERC20 transfer to update the shareholder set
- [x] Address added to set when balance goes from 0 to > 0
- [x] Address removed from set when balance reaches exactly 0
- [x] Hook fires on mint, transfer, and burn
- [x] `getShareholders()` always returns the current set with accurate balances

---

## US-INV-004: Receive and Push ETH Dividends to All Shareholders

> **As a** bank contract, **I want to** trigger ETH dividend distribution to all shareholders at once, **so that** profit-sharing is settled in a single transaction.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-INV-003

### Acceptance Criteria

- [x] `distributeNativeDividends(amount)` is `payable` and restricted to `onlyBank`
- [x] `onlyBank` modifier resolves Bank address at runtime via Officer
- [x] Iterates shareholder list; each shareholder receives `(balance / totalSupply) × amount` in ETH
- [x] Last shareholder receives the integer remainder to ensure full, lossless distribution
- [x] Reverts if `msg.value != amount`
- [x] Reverts if there are no shareholders

---

## US-INV-005: Receive and Push ERC20 Dividends to All Shareholders

> **As a** bank contract, **I want to** trigger ERC20 dividend distribution to all shareholders at once, **so that** token-denominated profits are distributed proportionally.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-INV-003

### Acceptance Criteria

- [x] `distributeTokenDividends(token, amount)` restricted to `onlyBank`
- [x] Pulls `amount` of `token` from Bank (Bank pre-approves before calling)
- [x] Iterates shareholder list; each shareholder receives proportional token amount
- [x] Last shareholder receives the integer remainder (lossless distribution)
- [x] Reverts if Bank has not approved sufficient allowance

---

## US-INV-006: View Current Shareholder List with Balances

> **As a** team member, **I want to** query the full shareholder list with each holder's balance, **so that** equity ownership is transparent without off-chain indexing.

**Status:** ✅ | **Priority:** P2 | **Effort:** XS | **Dependencies:** US-INV-003

### Acceptance Criteria

- [x] `getShareholders()` returns an array of `Shareholder { addr, balance }` structs
- [x] `view` function — no gas cost when called off-chain
- [x] Returns an empty array if no tokens have been minted
- [x] No access restriction — readable by anyone

---

_[← Back to index](../README.md)_
