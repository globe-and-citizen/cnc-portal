# Contract: ExpenseAccountEIP712

**Contract file:** `contract/contracts/expense-account/ExpenseAccountEIP712.sol`\
**Upgradeable:** Yes (Beacon)\
**Last updated:** 2026-10-02

This document owns current Solidity behaviour. The [Accounts feature](../../../features/accounts/README.md) owns the canonical `US-EXP-*`
product stories and acceptance criteria; contract capabilities do not allocate a second series of product story IDs.

## Funding and token support

- `receive()` accepts native currency from any address and emits `Deposited`.
- `depositToken(token, amount)` pulls a positive ERC-20 amount from the caller, requires the token to be supported and the contract to be
  unpaused, and emits `TokenDeposited`.
- An ERC-20 contract can transfer tokens directly to this address without calling `depositToken`. Such a transfer bypasses its token-support
  check and emits no Expense Account deposit event. The token balance can increase even when the asset is not usable for an approved spend
  or included in an owner sweep.
- The owner can add or remove ERC-20 support. `getSupportedTokens()` exposes the current support set; native currency is separate from that
  list. The contract's support set does not by itself supply portal metadata, pricing, or historical accounting evidence.

## Signed spending approvals

The owner signs an EIP-712 `BudgetLimit` bound to the contract and chain. `transfer` verifies the signature, recipient, dates, budget
limits, and relevant token rules, then pays from the Expense Account's own balance. A valid signature does not reserve funds. The recipient
can spend only what remains within the approval and contract balance.

### Period boundaries

The signed `startDate` anchors the approval. The first calendar week or month can therefore be shorter than a complete week or month.

| Frequency | Boundary used by `getPeriod`                                                                |
| --------- | ------------------------------------------------------------------------------------------- |
| One-time  | A single period with no reset.                                                              |
| Daily     | Consecutive 24-hour intervals from `startDate`.                                             |
| Weekly    | Monday 00:00 UTC; the first period ends at the next Monday.                                 |
| Monthly   | First day of each calendar month at 00:00 UTC; the first period ends at the next month.     |
| Custom    | Consecutive intervals of the positive signed `customFrequency` in seconds from `startDate`. |

The signed `endDate` is a Unix timestamp. `transfer` rejects a spend after that instant; the product rule for a date chosen in the portal
must specify the instant sent by the form separately.

## Approval activation

`deactivateApproval(signatureHash)` and `activateApproval(signatureHash)` are owner-only writes to the usage record associated with the
signature hash. The shared `_validateTransfer` rejects an inactive record before usage is updated or funds move, for both one-time and
recurring approvals. Reactivation changes only the active state; the original signed limits and expiry still apply. The
[approval-control story](../../../features/accounts/README.md#us-exp-003-deactivate-or-reactivate-an-approval) owns the product acceptance
and validation state.

## Return to Bank

`ownerWithdrawAllToBank()` is an owner-only, non-reentrant action available while the contract is unpaused. It resolves the Bank through the
same Officer generation, then sends the native balance and balances of every token _currently_ in `getSupportedTokens()`. It does not revoke
signed approvals or sweep tokens removed from support. The portal's
[direct return story](../../../features/accounts/README.md#us-exp-006-return-expense-account-funds-to-bank) owns the visible workflow; the
[Bank cash-out story](../../../features/accounts/README.md#us-bank-004-cash-out-available-treasury-funds) owns the separate multi-account
orchestration.

## Known Gaps

- `transfer` is not guarded by `whenNotPaused`, so pausing the contract does not currently block an approved spend.
- One-time approvals return from validation before the supported-token check, so an unsupported ERC-20 held by the contract can be spent.
- A direct ERC-20 transfer can leave an unsupported balance outside the supported-token owner sweep. Direct-movement discovery and
  reconciliation are planned in [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878).

## Implementation Evidence

**Implementation evidence reviewed against:** `d2caa0c9822c5b325aa690b2f4c9d597291cddc0`

- [Expense Account contract](../../../../contract/contracts/expense-account/ExpenseAccountEIP712.sol)
- [Core contract tests](../../../../contract/test/ExpenseAccountEIP712.spec.ts),
  [approval lifecycle tests](../../../../contract/test/ExpenseAccountEIP712V2.spec.ts),
  [calendar-period tests](../../../../contract/test/ExpenseAccountEIP712V2.calendarBasedPeriods.spec.ts),
  [custom-frequency tests](../../../../contract/test/ExpenseAccountEIP712V2.customFrequency.spec.ts), and
  [period-boundary tests](../../../../contract/test/ExpenseAccountEIP712V2.isNewPeriod.spec.ts)

_[← Back to index](../README.md)_
