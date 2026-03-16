# Contract: FeeCollector

**Epic Goal:** Collect protocol fees from all team contracts and allow the protocol owner to configure rates and withdraw accumulated funds.
**Contract File:** `contracts/FeeCollector.sol`
**Upgradeable:** Yes
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                | Status | Effort |
| ---------- | ---------------------------------------------------- | ------ | ------ |
| US-FEE-001 | Configure fee rates per contract type (basis points) | ✅     | S      |
| US-FEE-002 | Accept ETH and ERC20 fee payments                    | ✅     | S      |
| US-FEE-003 | Query fee rate for a contract type                   | ✅     | XS     |
| US-FEE-004 | Withdraw accumulated fees (ETH or ERC20)             | ✅     | S      |

**4 / 4 stories complete**

---

## Implementation Notes

- **Contract:** `contracts/FeeCollector.sol`
- **Key functions:** `setFee`, `getFeeFor`, `getAllFeeConfigs`, `withdraw`, `withdrawToken`, `addTokenSupport`, `removeTokenSupport`, `getBalance`, `getTokenBalance`
- **Access roles:** `onlyOwner` for all write operations; `getFeeFor` and balance queries are public
- **Fee unit:** Basis points (bps); 50 bps = 0.5%; 10000 bps = 100%
- **Dependencies:** Officer stores FeeCollector address and delegates fee queries; Bank uses `getFeeFor("BANK")` and `isFeeCollectorToken(token)` before charging fees
- **Protections:** `ReentrancyGuard` on withdrawals

---

## US-FEE-001: Configure Fee Rates per Contract Type (Basis Points)

> **As a** protocol owner, **I want to** set a fee rate for each contract type, **so that** a consistent protocol fee is charged across all team transactions of that type.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `setFee(contractType, feeBps)` stores or updates the fee for a named contract type (e.g. `"BANK"`)
- [x] Restricted to `onlyOwner`
- [x] `feeBps` must be ≤ 10000 (100%); reverts otherwise
- [x] Setting `feeBps = 0` effectively disables the fee for that type
- [x] `getAllFeeConfigs()` returns all `FeeConfig { contractType, feeBps }` entries

---

## US-FEE-002: Accept ETH and ERC20 Fee Payments

> **As a** team contract (e.g. Bank), **I want to** send protocol fees to FeeCollector, **so that** fees accumulate in one place for the protocol owner to withdraw.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `receive()` accepts plain ETH transfers from any address (team contracts send fee ETH here)
- [x] ERC20 fee tokens transferred directly to FeeCollector via `safeTransfer` by the paying contract
- [x] No explicit deposit function needed — ERC20 balances tracked via `IERC20.balanceOf`
- [x] `addTokenSupport(token)` whitelists an ERC20 as a supported fee token (owner only)
- [x] `removeTokenSupport(token)` removes a token from the whitelist (owner only)

---

## US-FEE-003: Query Fee Rate for a Contract Type

> **As a** team contract, **I want to** look up the fee rate for my type, **so that** I can compute the correct fee amount before charging a user.

**Status:** ✅ | **Priority:** P1 | **Effort:** XS | **Dependencies:** US-FEE-001

### Acceptance Criteria

- [x] `getFeeFor(contractType)` returns the configured `feeBps` as `uint16`
- [x] Returns `0` for contract types that have no fee configured (no revert)
- [x] `view` function — no gas when called off-chain
- [x] Called by Officer's `getFeeFor` which Bank delegates to at runtime

---

## US-FEE-004: Withdraw Accumulated Fees (ETH or ERC20)

> **As a** protocol owner, **I want to** withdraw accumulated ETH and ERC20 fees from FeeCollector, **so that** protocol revenue is accessible.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-FEE-002

### Acceptance Criteria

- [x] `withdraw(amount)` transfers `amount` of ETH to the owner
- [x] `withdrawToken(token, amount)` transfers `amount` of a supported ERC20 to the owner
- [x] Both restricted to `onlyOwner`
- [x] Reverts if balance < `amount`
- [x] ReentrancyGuard protects both functions
- [x] `getBalance()` returns current ETH balance; `getTokenBalance(token)` returns ERC20 balance

---

_[← Back to index](../README.md)_
