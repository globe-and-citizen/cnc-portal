# Contract: SafeDepositRouter

**Epic Goal:** Let users deposit whitelisted tokens and receive SHER (InvestorV1) equity tokens in return, routing deposits to a Safe wallet.
**Contract File:** `contracts/SafeDepositRouter.sol`
**Upgradeable:** Yes
**Last updated:** 2026-03-16

---

## Status Overview

| User Story | Title                                                     | Contract | Frontend | Effort |
| ---------- | --------------------------------------------------------- | :------: | :------: | ------ |
| US-SDR-001 | Deposit a whitelisted token and receive SHER (InvestorV1) | ✅       | 🚫       | L      |
| US-SDR-002 | Deposit with slippage protection (minimum SHER out)       | ✅       | 🚫       | M      |
| US-SDR-003 | Calculate expected SHER compensation before depositing    | ✅       | 🚫       | S      |
| US-SDR-004 | Enable/disable deposits                                   | ✅       | 🚫       | S      |
| US-SDR-005 | Recover accidentally sent tokens                          | ✅       | 🚫       | S      |

**Contract: 5 / 5 — Frontend: 0 / 5**

---

## Implementation Notes

- **Contract:** `contracts/SafeDepositRouter.sol`
- **Key functions:** `deposit`, `depositWithSlippage`, `calculateCompensation`, `enableDeposits`, `disableDeposits`, `addTokenSupport`, `removeTokenSupport`, `setMultiplier`, `setSafeAddress`, `recoverERC20`
- **Access roles:** `onlyOwner` for all configuration functions; `deposit`/`depositWithSlippage` open to anyone
- **Formula:** `SHER = normalize(tokenAmount, sherDecimals) × multiplier ÷ 10^sherDecimals`
- **Token decimals:** Stored at whitelist time to prevent manipulation
- **Dependencies:** InvestorV1 (`individualMint` to mint SHER to depositor); Safe wallet (receives deposited tokens)
- **Two-level stop:** `disableDeposits()` for normal pause; `pause()` for emergency

---

## US-SDR-001: Deposit a Whitelisted Token and Receive SHER (InvestorV1)

> **As a** shareholder, **I want to** deposit a supported token and immediately receive SHER equity tokens, **so that** I can participate in team ownership through a token swap mechanism.

**Status:** ✅ | **Priority:** P1 | **Effort:** L | **Dependencies:** US-SDR-004

### Acceptance Criteria

- [x] `deposit(token, amount)` transfers `amount` of `token` from the caller to the Safe wallet
- [x] Caller must have pre-approved SafeDepositRouter to spend `amount` of `token`
- [x] `token` must be on the whitelist; reverts otherwise
- [x] Deposits must be enabled; reverts if disabled or paused
- [x] SHER amount computed via `calculateCompensation(token, amount)`
- [x] `InvestorV1.individualMint(msg.sender, sherAmount)` called to mint equity tokens
- [x] Reverts if computed SHER amount is zero

---

## US-SDR-002: Deposit with Slippage Protection (Minimum SHER Out)

> **As a** depositor, **I want to** specify a minimum SHER output when depositing, **so that** my transaction reverts if the computed compensation drops below an acceptable threshold.

**Status:** ✅ | **Priority:** P2 | **Effort:** M | **Dependencies:** US-SDR-001

### Acceptance Criteria

- [x] `depositWithSlippage(token, amount, minSherOut)` performs the same deposit as `deposit`
- [x] After computing `sherAmount`, reverts with `InsufficientCompensation` if `sherAmount < minSherOut`
- [x] `minSherOut = 0` is accepted (equivalent to calling `deposit`)
- [x] Slippage check happens before any state changes or external calls

---

## US-SDR-003: Calculate Expected SHER Compensation Before Depositing

> **As a** depositor, **I want to** preview how much SHER I will receive for a given token and amount, **so that** I can make an informed decision before submitting the transaction.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `calculateCompensation(token, amount)` returns the SHER amount for a given deposit
- [x] Uses stored token decimals (captured at whitelist time) for normalization
- [x] Formula: `normalize(amount, sherDecimals) × multiplier ÷ 10^sherDecimals`
- [x] `view` function — no gas cost when called off-chain
- [x] Returns `0` for tokens not on the whitelist (no revert)

---

## US-SDR-004: Enable/Disable Deposits

> **As a** protocol owner, **I want to** control whether deposits are accepted, **so that** I can open or close the swap window without deploying a new contract.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] Deposits disabled by default at initialization
- [x] `enableDeposits()` sets the deposits flag to active (owner only)
- [x] `disableDeposits()` sets the flag to inactive (owner only)
- [x] `deposit` and `depositWithSlippage` revert with `DepositsDisabled` when flag is inactive
- [x] `pause()` provides an emergency stop that also blocks deposits (Pausable inheritance)

---

## US-SDR-005: Recover Accidentally Sent Tokens

> **As a** protocol owner, **I want to** rescue ERC20 tokens accidentally sent to the router, **so that** no funds are permanently locked in the contract.

**Status:** ✅ | **Priority:** P3 | **Effort:** S | **Dependencies:** none

### Acceptance Criteria

- [x] `recoverERC20(token, amount)` transfers `amount` of `token` to the Safe wallet (owner only)
- [x] Can be called for any ERC20 including whitelisted tokens
- [x] Reverts if the contract does not hold sufficient balance
- [x] Tokens sent to Safe, not to `msg.sender`, to prevent owner from extracting depositor funds

---

_[← Back to index](../README.md)_
