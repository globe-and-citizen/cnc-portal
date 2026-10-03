# Treasury Flow Relationships

**Purpose:** Link the canonical stories for movements that cross Bank, Expense Account, Payroll, and Accounting. The linked feature READMEs
own their acceptance criteria; this map does not duplicate them.

The [feature documentation guide](../../platform/feature-specification-guide.md#cross-domain-story-relationships) defines the relationship
types. A single transfer can have source and destination evidence, but Accounting groups matching evidence under one source operation.

| Movement                | Relationship     | Initiating story                                                                   | Receiving outcome                                                                         | Accounting rule or status                                                                                                                                                                          |
| ----------------------- | ---------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wallet → Bank           | Direct funding   | [US-BANK-001](README.md#us-bank-001-fund-the-bank)                                 | Bank balance in the same story                                                            | [UC-BANK-02](../accounting/journal-entry-catalogue.md#uc-bank-02--external-cash-receipt)                                                                                                           |
| Wallet → Expense        | Direct funding   | [US-EXP-005](README.md#us-exp-005-fund-the-expense-account)                        | Expense balance and spending availability in the same story                               | Direct-movement classification planned in [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878)                                                                                     |
| Wallet → Payroll        | Direct funding   | [US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract)    | Payroll balance and claim-payment availability in the same story                          | Direct-movement classification planned in [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878)                                                                                     |
| Bank → Expense          | Transfer handoff | [US-BANK-002](README.md#us-bank-002-transfer-bank-funds)                           | [US-EXP-005](README.md#us-exp-005-fund-the-expense-account)                               | [UC-BANK-03](../accounting/journal-entry-catalogue.md#uc-bank-03--bank-funds-a-company-pocket), with a fee when applicable                                                                         |
| Bank → Payroll          | Transfer handoff | [US-BANK-002](README.md#us-bank-002-transfer-bank-funds)                           | [US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract)           | [UC-BANK-03](../accounting/journal-entry-catalogue.md#uc-bank-03--bank-funds-a-company-pocket), with a fee when applicable                                                                         |
| Expense → Bank          | Transfer handoff | [US-EXP-006](README.md#us-exp-006-return-expense-account-funds-to-bank)            | Bank balance in [US-BANK-003](README.md#us-bank-003-review-the-bank-position-and-history) | [INTERNAL](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer) after direct-source discovery in [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878) |
| Payroll → Bank          | Transfer handoff | [US-PAYROLL-014](../payroll/README.md#us-payroll-014-return-payroll-funds-to-bank) | Bank balance in [US-BANK-003](README.md#us-bank-003-review-the-bank-position-and-history) | [INTERNAL](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer) after direct-source discovery in [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878) |
| Sources → Bank → wallet | Orchestration    | [US-BANK-004](README.md#us-bank-004-cash-out-available-treasury-funds)             | Source returns above, then wallet cash-out                                                | [INTERNAL](../accounting/journal-entry-catalogue.md#internal--other-company-pocket-transfer), then [CASH-OUT](../accounting/journal-entry-catalogue.md#cash-out--external-bank-or-safe-payment)    |

## Shared policy and derived projections

- Token eligibility is evaluated at both the initiating account and the receiving account. A Bank-supported ERC-20 is not automatically
  supported for Expense spending or Payroll claims. The portal can offer a new Expense approval only for native currency or an ERC-20 in
  both the current contract support set and the product token catalogue. An unsolicited ERC-20 transfer can still increase a contract
  balance; it is not evidence that the token is spendable or sweepable.
- Each domain owns its balance and activity display. [Accounting](../accounting/README.md) owns historical source identification,
  classification, mirror removal, and complete journal entries; [#2878](https://github.com/globe-and-citizen/cnc-portal/issues/2878) plans
  missing direct-wallet movement evidence. No destination story creates a second Bank transfer or a second journal entry.

## Proposed token expansion

Treat token onboarding as a shared capability with a per-network eligibility matrix. For each proposed asset, record its address, decimals,
symbol, pricing source, and whether Bank, Expense, Payroll, and Accounting can each handle it. A contract's `getSupportedTokens()` result
controls its current on-chain eligibility; the product catalogue supplies trusted display and amount metadata. New approval or transfer
choices require both. A token becomes available in a journey only after its destination contract, write path, balance and activity views,
and Accounting classification have representative proof. Roll out each network and domain explicitly rather than assuming that adding a
token to one contract enables it everywhere. This is a proposal for product review; no additional token is enabled by this document.
