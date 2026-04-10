# Contract: CashRemunerationEIP712

**Epic Goal:** Pay employees wages (in multiple tokens and/or equity) using owner-signed claims that can be submitted at any time.
**Contract File:** `contracts/CashRemunerationEIP712.sol`
**Upgradeable:** Yes (Beacon)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                   | Contract | Frontend | Effort |
| ---------- | ------------------------------------------------------- | :------: | :------: | ------ |
| US-CR-001  | Withdraw wages with an owner-signed claim (EIP-712)     | ✅       | 🚫       | L      |
| US-CR-002  | Pay wages in multiple tokens in a single transaction    | ✅       | 🚫       | M      |
| US-CR-003  | Mint equity (InvestorV1) tokens as part of compensation | ✅       | 🚫       | M      |
| US-CR-004  | Prevent double payment via claim hash                   | ✅       | 🚫       | S      |
| US-CR-005  | Disable/enable a wage claim before it is submitted      | ✅       | 🚫       | S      |

**Contract: 5 / 5 — Frontend: 0 / 5**

---

## Implementation Notes

- **Contract:** `contracts/CashRemunerationEIP712.sol`
- **Key functions:** `withdraw`, `enableClaim`, `disableClaim`
- **Access roles:** Employee holds signed claim and calls `withdraw`; `onlyOwner` for `enableClaim`/`disableClaim`
- **EIP-712:** Typed data includes employee address, array of `{ token, amount }` entries, timestamp, and nonce
- **Dependencies:** InvestorV1 (`MINTER_ROLE` granted to this contract for equity minting); Officer (runtime InvestorV1 resolution)
- **Anti-replay:** Timestamp in the claim struct prevents reuse across different pay periods; claim hash stored after use

---

## US-CR-001: Withdraw Wages with an Owner-Signed Claim (EIP-712)

> **As an** employee, **I want to** submit a signed wage claim and receive my wages on-chain, **so that** payment is settled without requiring the owner to be online at withdrawal time.

**Status:** ✅ | **Priority:** P1 | **Effort:** L | **Dependencies:** US-CR-004

### Acceptance Criteria

- [x] `withdraw(wageClaim, signature)` verifies the EIP-712 signature
- [x] Signature recovery confirms signer is the contract owner
- [x] `wageClaim.employee` must equal `msg.sender`
- [x] Reverts if the claim hash has already been used (double-payment prevention)
- [x] Reverts if the claim has been disabled by the owner
- [x] Executes all token transfers and equity mints in a single transaction
- [x] Marks the claim hash as used after successful execution

---

## US-CR-002: Pay Wages in Multiple Tokens in a Single Transaction

> **As a** team owner, **I want to** include multiple token payments in a single signed wage claim, **so that** an employee receives their full compensation (e.g., ETH + USDC) atomically.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-CR-001

### Acceptance Criteria

- [x] `wageClaim` struct includes an array of `{ token, amount }` entries
- [x] ETH payments: `token = address(0)` signals native ETH transfer
- [x] ERC20 payments: contract holds tokens and transfers on `withdraw`
- [x] All transfers happen atomically — if any fails, the entire withdrawal reverts
- [x] Contract must hold sufficient balances for all token amounts in the claim

---

## US-CR-003: Mint Equity (InvestorV1) Tokens as Part of Compensation

> **As a** team owner, **I want to** include equity token minting in a wage claim, **so that** employees receive their equity compensation on-chain alongside cash wages.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** US-CR-001

### Acceptance Criteria

- [x] InvestorV1 address in the token array signals equity minting (not transfer)
- [x] CashRemuneration holds `MINTER_ROLE` on InvestorV1 (granted at deployment)
- [x] `individualMint(employee, amount)` called on InvestorV1 for equity entries
- [x] Equity minting and cash transfers execute atomically in the same `withdraw` call
- [x] Reverts if MINTER_ROLE has been revoked

---

## US-CR-004: Prevent Double Payment via Claim Hash

> **As a** system, **I want to** record each used claim hash, **so that** a signed wage claim can only be submitted and paid once.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] Claim hash computed from the full EIP-712 typed data (including timestamp)
- [x] Hash recorded in a mapping after successful `withdraw`
- [x] `withdraw` reverts with `ClaimAlreadyUsed` if hash is already in the mapping
- [x] Timestamp in claim struct also prevents replay across different pay periods

---

## US-CR-005: Disable/Enable a Wage Claim Before It Is Submitted

> **As a** team owner, **I want to** revoke a specific signed wage claim before the employee submits it, **so that** I can correct mistakes without issuing a new contract.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-CR-001

### Acceptance Criteria

- [x] `disableClaim(signatureHash)` marks a specific claim as disabled (owner only)
- [x] `enableClaim(signatureHash)` re-enables a previously disabled claim (owner only)
- [x] `withdraw` reverts with `ClaimDisabled` if the claim's hash is in the disabled set
- [x] Disabling is immediate — the employee cannot submit the claim after this point

---

_[← Back to index](../README.md)_
