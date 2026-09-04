# Accounting Journal Entry Catalogue

**Scope:** The use cases currently mapped into Accounting and the balanced `JournalEntry` templates they produce

This is the canonical catalogue for the current Accounting use-case to journal-entry mapping. The
[Money-Flow Catalogue](./money-flow-catalogue.md) remains a worked accounting exercise and reference model; it does not define the current
mapper coverage or account nomenclature.

## Reading a Journal Entry

A `JournalEntry` is the validated accounting record displayed by the General Ledger. It has one or more debit lines and one or more credit
lines; their USD totals must be equal. Account names below refer to account families. A deployment-scoped cash account is resolved to its
concrete contract instance in the actual entry, for example `Cash — Bank 2` after a redeployment.

The journal assembly groups normalized postings that share a `sourceOperationId`. A mapper must deliberately preserve that identity when one
economic operation creates several indexed events. The current coverage of that grouping is stated in
[Operation Boundaries](#operation-boundaries).

## Bank Transfer with a Fee

A Bank transfer and its `FeePaid` event from the same on-chain transaction form one entry. The transfer amount is the amount received by the
destination; Bank decreases by that amount plus the fee.

For a 100 USD transfer to Payroll with a 1 USD fee:

| Account                 | Debit | Credit |
| ----------------------- | ----: | -----: |
| Cash — Payroll          |   100 |        |
| Transaction Fee Expense |     1 |        |
| Cash — Bank             |       |    101 |

The fee is an expense of the company whose Bank paid it. It is neither an internal cash transfer nor a `Fee` filter category. When the
transfer is external, the destination debit is the classified account; without a classification it is `Operating Expense`.

If only `FeePaid` is available in the feed, it remains a standalone entry:

| Account                 | Debit | Credit |
| ----------------------- | ----: | -----: |
| Transaction Fee Expense |     1 |        |
| Cash — Bank             |       |      1 |

The current company read model does not create the separate protocol-wide counter-entry in `Cash — FeeCollector` and `Protocol Fee Revenue`.
That is a distinct protocol entity and is outside this company's generated journal.

## Current Use Cases

### Cash, Capital, and Treasury

| Use case       | Source condition                                                                        | Journal entry                                                              |
| -------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `UC-BANK-01`   | A founder deposits into Bank or Safe without receiving SHER.                            | Dr Cash — Bank/Safe · Cr Owner Capital                                     |
| `UC-BANK-02`   | A non-founder deposits into Bank or Safe and no more specific rule applies.             | Dr Cash — Bank/Safe · Cr Service Revenue                                   |
| `UC-SDR-01`    | An investor uses SafeDepositRouter and receives SHER.                                   | Dr Cash — Safe · Cr Investor Equity                                        |
| `UC-MEMBER-01` | A company member funds the Safe directly when the matching router event is unavailable. | Dr Cash — Safe · Cr Investor Equity                                        |
| `UC-BANK-03`   | Bank funds a known company cash pocket.                                                 | Dr Cash — destination pocket · Cr Cash — Bank                              |
| `INTERNAL`     | A known company pocket funds another one, including an owner sweep back to Bank.        | Dr Cash — destination pocket · Cr Cash — source pocket                     |
| `FEE`          | Bank emits `FeePaid`; duplicate Bank and FeeCollector logs are deduplicated.            | Dr Transaction Fee Expense · Cr Cash — Bank                                |
| `CASH-OUT`     | A Bank or Safe outflow is unclassified, or is classified as an external outflow.        | Dr classified expense, capital, or liability account · Cr Cash — Bank/Safe |
| `CASH-IN`      | A Bank or Safe inflow has an accepted manual classification.                            | Dr Cash — Bank/Safe · Cr classified income, equity, or liability account   |

`UC-BANK-02` and the unclassified `CASH-OUT` are visible fallbacks, not proof of the economic nature of a counterparty. The unclassified
outflow is provisionally `Dr Operating Expense · Cr Cash` and is marked as needing off-chain data.

### Payroll, Expenses, and Dividends

| Use case     | Source condition                                                  | Journal entry                                                                                                      |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `UC-CASH-02` | An eligible weekly wage claim reaches the end of its work week.   | Cash wage: Dr Payroll Expense · Cr Wage Payable. SHER wage: Dr Deferred SHER Compensation · Cr SHERS To Be Issued. |
| `UC-CASH-03` | A member withdraws an earned wage.                                | Cash: Dr Wage Payable · Cr Cash — Payroll. SHER: Dr SHERS To Be Issued · Cr Investor Equity.                       |
| `UC-EXP-01`  | An approved Expense Account payout reaches an external recipient. | Dr Operating Expense · Cr Cash — Expense                                                                           |
| `UC-INV-01`  | InvestorV1 emits one `DividendPaid` for a shareholder.            | Dr Dividend Expense · Cr Cash — Bank                                                                               |

Payroll is accrual accounting: the cash wage expense is recognized at `UC-CASH-02` and the liability clears at `UC-CASH-03`. The SHER part
is a non-cash equity movement; it does not create Payroll Expense or Wage Payable.

### Community Credit

| Use case       | Source condition                                                   | Journal entry                                                                                                                                                                     |
| -------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `UC-CREDIT-01` | A Community Credit offer funds and its principal is swept to Bank. | Dr Cash — Bank · Cr Loan Payable                                                                                                                                                  |
| `UC-CREDIT-05` | The funded offer's fixed return becomes owed to its lenders.       | Dr Interest Expense · Cr Interest Payable                                                                                                                                         |
| `UC-CREDIT-03` | A lender is repaid.                                                | Principal: Dr Loan Payable · Cr Cash — Bank. Interest already accrued: Dr Interest Payable · Cr Cash — Bank. Interest that was not accrued: Dr Interest Expense · Cr Cash — Bank. |

`FundsLent` is a lender pledge to an external contract and creates no company journal entry before the offer funds. An unfunded offer's
refund likewise creates no entry because the principal was never recognized by the company.

`UC-CREDIT-02` and `UC-CREDIT-04` remain declared legacy use-case identifiers, but no current mapper emits them. They must not be used as
evidence of a generated journal entry.

### SHER Issuance and Vesting

| Use case     | Source condition                                                                                   | Journal entry                                         |
| ------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `DEFAULT-D`  | An Investor `Minted` event is not backed by a router deposit, wage withdrawal, or vesting release. | Dr SHERS To Be Issued · Cr Investor Equity            |
| `UC-VEST-01` | A vesting schedule is created.                                                                     | Dr Deferred SHER Compensation · Cr SHERS To Be Issued |
| `UC-VEST-02` | Vested SHER is released and minted.                                                                | Dr SHERS To Be Issued · Cr Investor Equity            |
| `UC-VEST-03` | A schedule stops with an unvested remainder.                                                       | Dr SHERS To Be Issued · Cr Deferred SHER Compensation |

The `Minted` event emitted by a router investment, SHER wage withdrawal, or vesting release is already represented by its backing use case
and is not booked again as `DEFAULT-D`.

### Manual Classification

An owner can classify a Bank or Safe movement only when its counterparty is external. A transfer between two known company pockets is always
internal and cannot be reclassified.

| Classification    | Cash in                      | Cash out                        |
| ----------------- | ---------------------------- | ------------------------------- |
| Revenue           | Dr Cash · Cr Service Revenue | Not permitted                   |
| Expense           | Not permitted                | Dr Operating Expense · Cr Cash  |
| Payroll           | Not permitted                | Dr Payroll Expense · Cr Cash    |
| Interest          | Not permitted                | Dr Interest Expense · Cr Cash   |
| Dividend          | Not permitted                | Dr Dividend Expense · Cr Cash   |
| Owner Capital     | Dr Cash · Cr Owner Capital   | Dr Owner Capital · Cr Cash      |
| Shareholder Loan  | Dr Cash · Cr Loan Payable    | Dr Loan Payable · Cr Cash       |
| Internal Transfer | Dr Cash · Cr source pocket   | Dr destination pocket · Cr Cash |

## Operation Boundaries

The intended invariant is one economic operation to one complete `JournalEntry`. Current mappers meet this boundary for the cases below; the
remaining cases are documented gaps rather than silently treated as complete.

| Operation                                                                                                            | Current journal boundary                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Bank transfer plus `FeePaid`                                                                                         | One entry, grouped by the transaction-hash `sourceOperationId`.                                                                        |
| Weekly payroll accrual with several wage rates                                                                       | One entry, grouped by the synthetic weekly-claim operation identity.                                                                   |
| Funded Community Credit principal from several lenders                                                               | One entry, grouped by the funding operation identity.                                                                                  |
| Cash and SHER wage settlement, dividend distribution, credit repayment with principal and interest, and vesting stop | Some source mappers do not yet propagate one shared `sourceOperationId`; their related postings can therefore remain separate entries. |

Trading use cases (`UC-TRD-01` through `UC-TRD-03`) appear in the historical Money-Flow Catalogue but are not current `UseCase` values and
have no current mapper. They are intentionally excluded from this catalogue.

## Implementation Evidence

**Implementation evidence reviewed against:** `965526c616447dad64398d3791b47096f73b21e2`

- [Use-case identifiers and source-operation identity](../../../app/src/utils/accounting/ledgerEntry.ts)
- [Journal assembly](../../../app/src/utils/accounting/generalLedger.ts) and
  [validated journal model](../../../app/src/utils/accounting/journalEntry.ts)
- [Source mappers](../../../app/src/utils/accounting/mappers/), including [Bank](../../../app/src/utils/accounting/mappers/bank.ts),
  [fees](../../../app/src/utils/accounting/mappers/fees.ts), [Community Credit](../../../app/src/utils/accounting/mappers/fixedReturn.ts),
  and [manual classification](../../../app/src/utils/accounting/classification.ts)
- [Journal assembly regression tests](../../../app/src/utils/accounting/__tests__/journalAssembly.spec.ts) and
  [General Ledger projection tests](../../../app/src/utils/accounting/__tests__/journalLedgerPresenter.spec.ts)

## Related Documentation

- [Accounting user stories](./README.md)
- [Accounting Read Model](../../implementation/accounting-read-model/README.md)
- [Money-Flow Catalogue and Accounting Exercise](./money-flow-catalogue.md)
