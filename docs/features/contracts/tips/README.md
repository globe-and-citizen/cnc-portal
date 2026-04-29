# Contract: Tips

**Epic Goal:** Distribute ETH tips to team members either immediately (push) or as claimable balances (pull).
**Contract File:** `contracts/Tips.sol`
**Upgradeable:** Yes (Transparent Proxy)
**Last updated:** 2026-03-16

---

## Status Overview

| User Story  | Title                                                  | Contract | Frontend | Effort |
| ----------- | ------------------------------------------------------ | :------: | :------: | ------ |
| US-TIPS-001 | Push tips immediately to team members (pushTip)        | ✅       | 🚫       | M      |
| US-TIPS-002 | Accumulate tip balances for later withdrawal (sendTip) | ✅       | 🚫       | M      |
| US-TIPS-003 | Withdraw accumulated tip balance                       | ✅       | 🚫       | S      |
| US-TIPS-004 | Configure maximum recipients for push tips             | ✅       | 🚫       | S      |

**Contract: 4 / 4 — Frontend: 0 / 4**

---

## Implementation Notes

- **Contract:** `contracts/Tips.sol`
- **Key functions:** `pushTip`, `sendTip`, `withdraw`, `getBalance`, `updatePushLimit`
- **Access roles:** No restriction on `pushTip`/`sendTip` (any sender with ETH); `onlyOwner` for `updatePushLimit`; `withdraw` callable by any address with a balance
- **Pattern:** Remainder from integer division carried over to the next transaction (no ETH lost); `pushLimit` default 10, max 100 (gas safety on loops)
- **Upgradeable:** Uses TransparentProxy (not Beacon — independent upgrade path)

---

## US-TIPS-001: Push Tips Immediately to Team Members

> **As a** tipper, **I want to** send ETH that is immediately split equally and pushed to each recipient, **so that** team members receive their cut in the same transaction.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `pushTip(teamMembers[])` called with ETH attached (`msg.value > 0`)
- [x] ETH divided equally among all members in the array
- [x] Each member receives their share via direct ETH transfer in the same transaction
- [x] Integer remainder carried over to the contract balance for the next tip
- [x] Reverts if `teamMembers` is empty
- [x] Reverts if `teamMembers.length > pushLimit`
- [x] Reverts if contract is paused

---

## US-TIPS-002: Accumulate Tip Balances for Later Withdrawal

> **As a** tipper, **I want to** send ETH that is split into claimable balances without immediate transfer, **so that** recipients can withdraw at their convenience without risk of a failed transfer blocking the tip.

**Status:** ✅ | **Priority:** P1 | **Effort:** M | **Dependencies:** none

### Acceptance Criteria

- [x] `sendTip(teamMembers[])` called with ETH attached
- [x] ETH divided equally; each recipient's internal balance incremented
- [x] Integer remainder carried over to contract balance
- [x] No external ETH transfer occurs during `sendTip`
- [x] `getBalance(address)` returns the accumulated claimable balance for any address
- [x] No restriction on number of recipients (no pushLimit applied)

---

## US-TIPS-003: Withdraw Accumulated Tip Balance

> **As a** team member, **I want to** withdraw my accumulated tip balance, **so that** I receive ETH that was credited to me via `sendTip`.

**Status:** ✅ | **Priority:** P1 | **Effort:** S | **Dependencies:** US-TIPS-002

### Acceptance Criteria

- [x] `withdraw()` transfers the caller's full balance to `msg.sender`
- [x] Balance set to zero before transfer (reentrancy protection)
- [x] Reverts if caller has zero balance
- [x] Reverts if contract is paused
- [x] ReentrancyGuard protects the function

---

## US-TIPS-004: Configure Maximum Recipients for Push Tips

> **As a** team owner, **I want to** set the maximum number of recipients for a single `pushTip` call, **so that** gas costs are bounded and the transaction does not run out of gas.

**Status:** ✅ | **Priority:** P2 | **Effort:** S | **Dependencies:** US-TIPS-001

### Acceptance Criteria

- [x] `updatePushLimit(value)` restricted to `onlyOwner`
- [x] Minimum value: 1; maximum value: 100
- [x] Reverts if `value` is outside the valid range
- [x] Default `pushLimit` is 10 at initialization
- [x] `pushTip` reverts with `ExceedsPushLimit` if `teamMembers.length > pushLimit`

---

_[← Back to index](../README.md)_
