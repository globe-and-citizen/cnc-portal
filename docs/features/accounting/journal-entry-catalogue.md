# Accounting Use Cases, Posting Rules, and Journal Entries

**Scope:** Canonical bridge from transaction user stories to Accounting rule identifiers, processing, and General Ledger output

**Last reviewed:** Not yet reviewed

This catalogue answers one question for every supported transaction journey: **what evidence becomes which balanced journal entry, and how
does that entry appear in the General Ledger?** Transaction feature documentation owns the user action. This document owns its accounting
interpretation. The [Accounting Read Model](../../implementation/accounting-read-model/README.md) owns the shared implementation mechanics.

## Reading the Catalogue

- A user story describes a product action. An Accounting rule ID identifies how evidence from that action is booked.
- The runtime type is named `UseCase`, but its values do not all represent domain use cases. It also contains generic posting rules, an
  entry component, a legacy-named rule, and inactive identifiers.
- One user action may activate several accounting rules. For example, Community Credit funding recognizes principal and interest, while a
  later repayment settles them.
- One on-chain transaction becomes at most one finalized `JournalEntry`. Compatible lines from several events are grouped by the source
  operation; duplicate mirrors are removed.
- When grouped evidence carries several use-case IDs, the entry label comes from its primary non-fee draft while every compatible line stays
  visible.
- Every journal entry balances. Account and currency filters retain the complete entry, not isolated lines.
- `FEE` is component evidence. When a Bank outflow paid the fee, the fee line is merged into that outflow's entry and does not become a
  standalone General Ledger operation.
- Accounting rule IDs are stable, not gap-free. `UC-BANK-01` previously represented a founder deposit inferred as `Owner Capital`; that
  address-role inference was retired, while the existing `UC-BANK-02` identifier was preserved for direct external receipts.

The representative tables below show USD-valued General Ledger rows. The runtime also retains each line's original currency, quantity, and
rate of record. The examples illustrate account direction and balance; they do not impose a fixed transaction amount.

## Accounting Rule Taxonomy

| Kind                         | Identifiers                               | Meaning                                                                                            |
| ---------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Domain use case              | Active emitted `UC-*` identifiers         | A specific business accounting event with its own trigger and journal result                       |
| Legacy domain rule           | `DEFAULT-D`                               | Direct SHER issuance; semantically a domain rule despite its historical identifier                 |
| Generic posting rule         | `CASH-OUT`, `INTERNAL`                    | A reusable classification selected from transaction evidence across several product stories        |
| Entry component              | `FEE`                                     | Additional journal lines attached to a parent Bank outflow, never a standalone finalized operation |
| Declared inactive identifier | `UC-CREDIT-02`, `UC-CREDIT-04`, `CASH-IN` | A runtime value that no current source mapper emits                                                |
| No-posting boundary          | No identifier                             | Evidence is tracked, but no company journal entry is created at that lifecycle stage               |

## End-to-End Processing

```mermaid
flowchart LR
    Story[Transaction user story] --> Evidence[Contract events, Safe transfers, or portal records]
    Evidence --> Draft[Domain mapper creates JournalEntryDraft evidence]
    Draft --> Enrichment[Resolve timestamp, valuation, deployment account, and receipt context]
    Enrichment --> Reconcile[Remove mirrors and attach transaction fees]
    Reconcile --> Group[Group by source-operation identity]
    Group --> Validate[Build and validate one balanced JournalEntry]
    Validate --> Ledger[Project complete entry into General Ledger rows]
```

Synthetic entries, such as a weekly wage accrual, use a deterministic portal identity and have no transaction hash. On-chain entries use the
transaction hash as their source-operation identity. If required source, timestamp, or valuation evidence is incomplete, Accounting reports
that state instead of presenting the affected books as final.

## Story-to-Accounting-Rule Map

| Transaction journey          | User story IDs                                                                                      | Accounting rule IDs                                  | Posting moment                                                     | General Ledger result                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| Fund the Bank                | [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank)                                      | `UC-BANK-02`                                         | External funds reach Bank                                          | Service revenue receipt                                     |
| Transfer Bank funds          | [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds)                                | `UC-BANK-03`, `CASH-OUT`, `INTERNAL`; optional `FEE` | Bank transfer executes                                             | Treasury funding, external payment, and any transaction fee |
| Cash out treasury funds      | [US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds)                  | `INTERNAL`, then `CASH-OUT`; optional `FEE`          | Each cash-out step executes                                        | Pocket sweep followed by external payment                   |
| Spend from Expense           | [US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account)                       | `UC-EXP-01` or `INTERNAL`                            | Approved transfer executes                                         | Operating expense or pocket transfer                        |
| Manage Safe funds            | [US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds)                                  | `UC-BANK-02`, `CASH-OUT`, or `INTERNAL`              | Confirmed Safe transfer is indexed                                 | Receipt, external payment, or pocket transfer               |
| Fund Payroll                 | [US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract)                     | `UC-BANK-03` or `INTERNAL`                           | Funds reach Payroll                                                | Treasury funding transfer                                   |
| Submit a daily claim         | [US-PAYROLL-005](../payroll/README.md#us-payroll-005-submit-a-daily-claim)                          | `UC-CASH-02`                                         | The containing work week ends while eligible                       | Wage accrual                                                |
| Disable or re-enable a claim | [US-PAYROLL-009](../payroll/README.md#us-payroll-009-disable-or-re-enable-a-signed-weekly-claim)    | `UC-CASH-02`                                         | No entry on status change; ended claims accrue only while eligible | Wage accrual appears or is excluded                         |
| Withdraw a weekly claim      | [US-PAYROLL-010](../payroll/README.md#us-payroll-010-withdraw-an-approved-weekly-claim)             | `UC-CASH-03`                                         | Withdrawal executes                                                | Wage or SHER settlement                                     |
| Publish a credit call        | [US-CC-002](../community-credit/README.md#us-cc-002-publish-a-credit-call)                          | —                                                    | Terms are created without company funds moving                     | No ledger entry                                             |
| Lend to a round              | [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round)                          | `UC-CREDIT-01` and `UC-CREDIT-05`                    | The contribution funds the round; otherwise no posting             | Principal receipt and interest obligation when funded       |
| Resolve a stalled round      | [US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round)                        | `UC-CREDIT-01` and `UC-CREDIT-05`                    | A partial raise is accepted; a refund has no posting               | Principal receipt and interest obligation                   |
| Repay lenders                | [US-CC-005](../community-credit/README.md#us-cc-005-repay-lenders)                                  | `UC-CREDIT-03`                                       | Repayment is distributed                                           | Principal and interest settlement                           |
| Invest through the router    | [US-SHER-001](../shareholder-management/README.md#us-sher-001-invest-in-the-safe-and-receive-sher)  | `UC-SDR-01`                                          | Router deposit and SHER mint execute                               | Investor contribution                                       |
| Distribute dividends         | [US-SHER-002](../shareholder-management/README.md#us-sher-002-distribute-dividends-to-shareholders) | `UC-INV-01`                                          | Investor pays shareholders                                         | Dividend expense and cash outflow                           |
| Issue SHER directly          | [US-SHER-004](../shareholder-management/README.md#us-sher-004-issue-sher-to-a-shareholder)          | `DEFAULT-D`                                          | Unbacked mint executes                                             | Share issuance                                              |
| Create a vesting schedule    | [US-VESTING-001](../vesting/README.md#us-vesting-001-create-a-minute-precise-vesting-schedule)      | `UC-VEST-01`                                         | Grant is created                                                   | Restricted-stock commitment                                 |
| Release vested shares        | [US-VESTING-003](../vesting/README.md#us-vesting-003-release-accrued-shares)                        | `UC-VEST-02`                                         | Shares are released                                                | Promised shares become issued equity                        |
| Stop a vesting schedule      | [US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule)               | `UC-VEST-02` and/or `UC-VEST-03`                     | Stop executes                                                      | Accrued release and unvested cancellation                   |

## Treasury and Cash Rules

### `UC-BANK-02` — External Cash Receipt

**Source stories:** [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank) and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds).

- **Input:** A Bank deposit event or confirmed Safe inflow whose sender is not a known company pocket.
- **Processing:** The mapper resolves the receiving deployment account. A SafeDepositRouter-backed Safe inflow is removed here because
  `UC-SDR-01` owns that operation.
- **General Ledger:** Label `Service revenue`; activity links to the receiving Bank or Safe. The entry retains the original currency,
  quantity, rate, and transaction hash.

For a direct external receipt valued at $100:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| Cash — Bank or Cash — Safe |         100 |              |
| Service Revenue            |             |          100 |

An external wallet may belong to a company member; that alone does not make the receipt an internal transfer.

### `UC-BANK-03` — Bank Funds a Company Pocket

**Source stories:** [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds) and
[US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract).

- **Input:** A Bank transfer whose destination resolves to another known company cash pocket.
- **Processing:** The Bank event establishes the source operation. Mirrored destination evidence is removed; a same-transaction fee is
  attached before finalization.
- **General Ledger:** Label `Treasury funding`; activity links to the funded pocket. All transfer and fee lines appear in one entry.

For $100 received by the destination pocket and a $1 Bank fee:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Destination cash pocket |         100 |              |
| Transaction Fee Expense |           1 |              |
| Cash — Bank             |             |          101 |

### `INTERNAL` — Other Company-Pocket Transfer

**Source stories:** [US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds),
[US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account), and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds).

- **Input:** A confirmed movement between two known company pockets that is not owned by a more specific rule.
- **Processing:** Source and destination deployments are resolved separately. Mirrored evidence is deduplicated only when it describes the
  same operation and complementary movement.
- **General Ledger:** Label `Internal transfer`; activity links to the most specific owning journey. No revenue or expense is recognized.

For a $100 movement between two company pockets:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Destination cash pocket |         100 |              |
| Source cash pocket      |             |          100 |

### `CASH-OUT` — External Bank or Safe Payment

**Source stories:** [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds),
[US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds), and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds).

- **Input:** A Bank or Safe outflow to an address that is not a known company pocket.
- **Processing:** The mapper initially classifies the counter-account as `Operating Expense`. A valid account assignment may replace it with
  `Owner Capital`, `Payroll Expense`, `Interest Expense`, or `Dividend Expense`. Compound entries remain read-only.
- **General Ledger:** Label `Cash payment`; activity links to Bank or Safe. Account Assignments and the ledger show the same complete entry.

For a $100 external Bank payment assigned to Operating Expense and a $1 fee:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Operating Expense       |         100 |              |
| Transaction Fee Expense |           1 |              |
| Cash — Bank             |             |          101 |

### `FEE` — Transaction-Fee Component

**Source story:** [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds).

- **Input:** A generation-aware `FeePaid` event matched to a Bank outflow from the same source operation.
- **Processing:** Legacy local Bank fee events and current FeeCollector events are normalized, then attached to the parent transfer. An
  unmatched fee is withheld and reported as incomplete evidence.
- **General Ledger:** The lines appear inside the parent `UC-BANK-03` or `CASH-OUT` entry. `FEE` is used as a standalone label only by the
  presenter contract; valid assembled books do not expose an orphan fee entry.

For a parent $100 Bank payment carrying a $1 fee, the complete entry—not a separate fee transaction—is:

| Account                         | Debit (USD) | Credit (USD) |
| ------------------------------- | ----------: | -----------: |
| Parent transfer counter-account |         100 |              |
| Transaction Fee Expense         |           1 |              |
| Cash — Bank                     |             |          101 |

## Payroll and Expense Use Cases

### `UC-CASH-02` — Weekly Wage Accrual

**Source stories:** [US-PAYROLL-005](../payroll/README.md#us-payroll-005-submit-a-daily-claim) and
[US-PAYROLL-009](../payroll/README.md#us-payroll-009-disable-or-re-enable-a-signed-weekly-claim).

- **Input:** An ended weekly claim, its daily hours, applicable wage terms, overtime policy, and current eligibility status.
- **Processing:** Accounting calculates the canonical weekly amount at the week-end timestamp. A disabled claim is excluded; signing is not
  the accrual trigger. The entry is synthetic and has no transaction hash.
- **General Ledger:** Label `Wage accrual`; activity `Payroll: Claim`; date is the end of the work week.

For an ended eligible week with $80 of cash wages and $20 of SHER wages:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| Payroll Expense            |          80 |              |
| Deferred SHER Compensation |          20 |              |
| Wage Payable               |             |           80 |
| SHERS To Be Issued         |             |           20 |

Edits or deletions made before the week ends change the source amount; they do not create separate accounting operations.

### `UC-CASH-03` — Wage Settlement

**Source story:** [US-PAYROLL-010](../payroll/README.md#us-payroll-010-withdraw-an-approved-weekly-claim).

- **Input:** A Payroll withdrawal event enriched with the matching weekly claim.
- **Processing:** Cash and SHER settlement paths are distinguished by currency. A matching Investor mint from SHER settlement is removed as
  duplicate evidence.
- **General Ledger:** Label `Wage settlement`; activity `Payroll: Withdraw`; the transaction hash traces the settlement.

For settlement of $80 in cash wages and $20 in SHER wages:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| Wage Payable       |          80 |              |
| SHERS To Be Issued |          20 |              |
| Cash — Payroll     |             |           80 |
| Investor Equity    |             |           20 |

### `UC-EXP-01` — Approved Expense Payout

**Source story:** [US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account).

- **Input:** An Expense Account transfer to an external recipient and, when available, its approved portal budget.
- **Processing:** The mapper reconstructs the approval cap and remaining amount for the operation. When indexed payout events are entirely
  unavailable, the approved record's current drawn balance supplies one synthetic fallback entry per budget. An internal destination uses
  `INTERNAL` instead.
- **General Ledger:** Label `Operating expense`; activity links to the Expense journey. Indexed entries retain their transaction hash;
  fallback entries identify their synthetic source.

For a $100 approved payout to an external recipient:

| Account           | Debit (USD) | Credit (USD) |
| ----------------- | ----------: | -----------: |
| Operating Expense |         100 |              |
| Cash — Expense    |             |          100 |

Creating, deactivating, or reactivating an approval changes spending authority but moves no money, so it creates no journal entry.

## Community Credit Use Cases

### `UC-CREDIT-01` — Funded Principal

**Source stories:** [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round) and
[US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round).

- **Input:** A funded-round event, lender contributions, creation terms, and token identity.
- **Processing:** `FundsLent` events are held as contribution evidence while funds remain in the round. When the round funds or a partial
  raise is accepted, contributions are grouped by funding operation. A missing token or creation record produces memo-only evidence rather
  than a fabricated valuation.
- **General Ledger:** A zero-interest funding operation is labelled `Credit funds lent`. When fixed return is recognized in the same source
  operation, the principal and interest lines remain one entry under the primary use-case label.

For a funded principal of $100:

| Account      | Debit (USD) | Credit (USD) |
| ------------ | ----------: | -----------: |
| Cash — Bank  |         100 |              |
| Loan Payable |             |          100 |

A published, open, refunded, or not-yet-funded round does not change the company's books.

### `UC-CREDIT-05` — Fixed Return Recognized

**Source stories:** [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round) and
[US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round).

- **Input:** The funded principal and the offer's flat-interest terms.
- **Processing:** Accounting calculates each lender's fixed return when the round becomes funded. This synthetic obligation is grouped by
  lender but remains traceable to the funded offer.
- **General Ledger:** The interest lines share the funding operation with `UC-CREDIT-01`; the current primary label is
  `Credit interest owed`. The obligation is visible before cash repayment without creating a second funding entry.

For a $10 fixed return recognized when the round funds:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Interest Expense |          10 |              |
| Interest Payable |             |           10 |

### `UC-CREDIT-03` — Principal and Interest Repaid

**Source story:** [US-CC-005](../community-credit/README.md#us-cc-005-repay-lenders).

- **Input:** Lender repayment events and the principal and interest already recognized for the offer.
- **Processing:** Payments settle principal first, then recognized interest. Any interest not covered by a prior accrual is recognized as
  `Interest Expense` in the repayment operation. Multiple lender events from one transaction are grouped.
- **General Ledger:** Label `Credit repayment`; activity links to Community Credit; one repayment transaction remains one entry.

For repayment of $100 principal and $10 of previously recognized interest:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Loan Payable     |         100 |              |
| Interest Payable |          10 |              |
| Cash — Bank      |             |          110 |

If interest was not recognized earlier because its valuation evidence was unavailable, that amount debits `Interest Expense` instead of
`Interest Payable`.

## Shareholder and Vesting Rules

### `UC-SDR-01` — Investor Contribution

**Source story:** [US-SHER-001](../shareholder-management/README.md#us-sher-001-invest-in-the-safe-and-receive-sher).

- **Input:** A SafeDepositRouter deposit, its Safe receipt, and the matching Investor mint.
- **Processing:** The router operation owns the accounting entry. Matching Safe transfer and Investor mint evidence are removed so the
  investment is neither revenue nor a second share issuance.
- **General Ledger:** Label `Investor contribution`; activity links to the shareholder investment journey.

For a router investment valued at $100:

| Account         | Debit (USD) | Credit (USD) |
| --------------- | ----------: | -----------: |
| Cash — Safe     |         100 |              |
| Investor Equity |             |          100 |

### `UC-INV-01` — Dividend Paid

**Source story:** [US-SHER-002](../shareholder-management/README.md#us-sher-002-distribute-dividends-to-shareholders).

- **Input:** Per-shareholder `DividendPaid` events emitted by Investor.
- **Processing:** Bank's distribution-trigger summary is ignored to avoid double counting. Compatible shareholder payments in the same
  transaction are aggregated.
- **General Ledger:** Label `Dividend paid`; activity links to the shareholder journey. Recipient evidence remains available through the
  transaction even though the ledger presents the grouped operation.

For a $100 dividend distribution:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Dividend Expense |         100 |              |
| Cash — Bank      |             |          100 |

### `DEFAULT-D` — Direct SHER Issuance

**Source story:** [US-SHER-004](../shareholder-management/README.md#us-sher-004-issue-sher-to-a-shareholder).

- **Input:** An Investor `Minted` event not matched to a router investment, Payroll settlement, or Vesting release.
- **Processing:** Known backed mint paths are removed first. Only the remaining direct mint uses this default rule.
- **General Ledger:** Label `Share issuance`; activity links to the shareholder journey.

For directly issued SHER valued at $100:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| SHERS To Be Issued |         100 |              |
| Investor Equity    |             |          100 |

Shareholder migration claims are ownership migration evidence, not new issuance, and do not create this entry.

### `UC-VEST-01` — Vesting Grant

**Source story:** [US-VESTING-001](../vesting/README.md#us-vesting-001-create-a-minute-precise-vesting-schedule).

- **Input:** A vesting-schedule creation event with beneficiary, grant, and schedule identity.
- **Processing:** The full restricted-stock commitment is recognized when defined; no shares are minted at this point.
- **General Ledger:** Label `Vesting grant`; activity links to Vesting. The entry affects equity accounts, not profit.

For a restricted-stock grant valued at $100:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| Deferred SHER Compensation |         100 |              |
| SHERS To Be Issued         |             |          100 |

### `UC-VEST-02` — Vested SHER Released

**Source stories:** [US-VESTING-003](../vesting/README.md#us-vesting-003-release-accrued-shares) and
[US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule).

- **Input:** A vesting release event and its matching Investor mint.
- **Processing:** The Vesting event owns the entry; the matching Investor mint is removed. A stop may release accrued shares in the same
  transaction.
- **General Ledger:** Label `Vesting released`; activity links to the affected schedule.

For released SHER valued at $40:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| SHERS To Be Issued |          40 |              |
| Investor Equity    |             |           40 |

### `UC-VEST-03` — Unvested Grant Cancelled

**Source story:** [US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule).

- **Input:** A vesting stop event and the schedule's unvested remainder.
- **Processing:** Accounting reverses only the stopped schedule's unvested quantity. If nothing remains, no cancellation lines are posted.
  Any same-transaction accrued release is grouped with `UC-VEST-02`.
- **General Ledger:** A cancellation-only operation is labelled `Vesting stopped`. When the stop also releases accrued shares, both use
  cases remain one complete entry under the primary release-or-stop label.

For cancellation of an unvested remainder valued at $60:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| SHERS To Be Issued         |          60 |              |
| Deferred SHER Compensation |             |           60 |

The focused [Vesting accounting policy](./vesting-accounting-restricted-stock.md) explains why these entries remain outside the income
statement.

## Declared but Inactive Identifiers

The shared type still declares `UC-CREDIT-02`, `UC-CREDIT-04`, and `CASH-IN`, but no current source mapper emits them. They are not active
booking rules and must not be used to infer ledger coverage. New or reactivated identifiers require an implementation-backed rule, tests,
and an update to this catalogue.

## Shared General Ledger Rules

- The first visible row carries the operation date, label, transaction hash when present, activity, and action category. Every row carries
  its concrete account, debit or credit amount, currency, quantity, and rate.
- Action categories are derived from the finalized accounts and use case, not copied from a source event label.
- Redeployed cash accounts remain distinct concrete rows. General Ledger and Trial Balance navigation preserves that deployment identity.
- Memo-only operations explain incomplete economic evidence but do not invent debit or credit lines.
- A source feed marked loading, partial, or failed withholds final reports. A missing timestamp is never replaced with epoch time, and a
  missing valuation is never replaced with a current price.

## Implementation Evidence

**Implementation evidence reviewed against:** `b2939127ec1ee7d16f261cf04974f1b36f1345ce`

- [Accounting assembly](../../../app/src/utils/accounting/assemble.ts),
  [source mapper boundary](../../../app/src/utils/accounting/mappers/index.ts),
  [draft identity and use-case types](../../../app/src/utils/accounting/journalEntryDraft.ts), and
  [journal finalization](../../../app/src/utils/accounting/journalEntry.ts)
- [Bank mapper](../../../app/src/utils/accounting/mappers/bank.ts), [Safe mapper](../../../app/src/utils/accounting/mappers/safe.ts),
  [Payroll mapper](../../../app/src/utils/accounting/mappers/payroll.ts),
  [Expense mapper](../../../app/src/utils/accounting/mappers/expenseAccount.ts),
  [Community Credit mapper](../../../app/src/utils/accounting/mappers/fixedReturn.ts),
  [Investor mapper](../../../app/src/utils/accounting/mappers/investor.ts), and
  [Vesting mapper](../../../app/src/utils/accounting/mappers/vesting.ts)
- [General Ledger presenter](../../../app/src/utils/accounting/journalLedgerPresenter.ts),
  [ledger action categories](../../../app/src/utils/accounting/ledgerCategory.ts), and
  [activity destinations](../../../app/src/composables/accounting/useActivityDestination.ts)
- [Accounting rule tests](../../../app/src/utils/accounting/__tests/) and
  [contract-generation accounting tests](../../../app/src/composables/accounting/__tests__/useCNCAccounting.migration.spec.ts)

## Related Documentation

- [Accounting user stories](./README.md)
- [Accounting Read Model](../../implementation/accounting-read-model/README.md)
- [Vesting accounting policy](./vesting-accounting-restricted-stock.md)
- [Accounts](../accounts/README.md)
- [Payroll](../payroll/README.md)
- [Community Credit](../community-credit/README.md)
- [Shareholder Management](../shareholder-management/README.md)
- [Vesting](../vesting/README.md)
