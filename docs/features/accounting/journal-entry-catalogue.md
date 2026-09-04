# Accounting Journal Entry Catalogue

**Scope:** The use cases currently mapped into Accounting and the balanced `JournalEntry` templates they produce

This is the canonical catalogue for the current Accounting use-case to journal-entry mapping. The
[Money-Flow Catalogue](./money-flow-catalogue.md) remains a worked accounting exercise and reference model; it does not define the current
mapper coverage or account nomenclature.

## Journal Entry Rules

A `JournalEntry` is the validated accounting record displayed by the General Ledger. It has one or more debit lines and one or more credit
lines; their USD totals must be equal. Account names below refer to account families. A deployment-scoped cash account is resolved to its
concrete contract instance in the actual entry, for example `Cash — Bank 2` after a redeployment.

Each example below is one complete `JournalEntry`; its debit and credit totals are equal. The amounts are illustrative USD reporting
amounts. A SHER amount is valued at the rate of record for the operation date.

### Fee Invariant

A Bank fee never creates a `JournalEntry` by itself. It is an additional debit line in the same entry as the Bank transfer that caused it:

- the destination receives the transfer amount;
- `Transaction Fee Expense` receives the fee amount; and
- `Cash — Bank` is credited with the gross amount.

A `FeePaid` log without its fee-bearing Bank transfer is an incomplete source feed, not a fee-only accounting operation. It must be held for
reconciliation or reported as incomplete; it must not appear in the General Ledger or an export as a standalone `JournalEntry`.

## Cash, Capital, and Treasury Entries

### Founder Deposit into Bank — `UC-BANK-01`

A founder deposits 100 USD without receiving SHER.

| Account       | Debit | Credit |
| ------------- | ----: | -----: |
| Cash — Bank   |   100 |        |
| Owner Capital |       |    100 |

### Client Payment into Bank — `UC-BANK-02`

A client pays 100 USD for a service.

| Account         | Debit | Credit |
| --------------- | ----: | -----: |
| Cash — Bank     |   100 |        |
| Service Revenue |       |    100 |

### Founder Deposit into Safe — `UC-BANK-01`

A founder deposits 100 USD into the Safe without receiving SHER.

| Account       | Debit | Credit |
| ------------- | ----: | -----: |
| Cash — Safe   |   100 |        |
| Owner Capital |       |    100 |

### Investment through SafeDepositRouter — `UC-SDR-01`

An investor contributes 100 USD through SafeDepositRouter and receives SHER.

| Account         | Debit | Credit |
| --------------- | ----: | -----: |
| Cash — Safe     |   100 |        |
| Investor Equity |       |    100 |

### Member Contribution into Safe — `UC-MEMBER-01`

A company member contributes 100 USD directly into the Safe when the matching SafeDepositRouter event is unavailable. The entry is the same
capital contribution as an investment and records the SHER value in `Investor Equity`.

| Account         | Debit | Credit |
| --------------- | ----: | -----: |
| Cash — Safe     |   100 |        |
| Investor Equity |       |    100 |

### Bank Funds Payroll — `UC-BANK-03`

Bank transfers 100 USD into the Payroll pocket without a fee.

| Account        | Debit | Credit |
| -------------- | ----: | -----: |
| Cash — Payroll |   100 |        |
| Cash — Bank    |       |    100 |

### Bank Transfer with a Fee — `UC-BANK-03` + Fee

Bank transfers 100 USD into the Payroll pocket and the operation charges a 1 USD fee.

| Account                 | Debit | Credit |
| ----------------------- | ----: | -----: |
| Cash — Payroll          |   100 |        |
| Transaction Fee Expense |     1 |        |
| Cash — Bank             |       |    101 |

This is the only fee representation. There is no separate fee entry before, after, or alongside this `JournalEntry`.

### Bank Transfer to an External Recipient with a Fee — `CASH-OUT` + Fee

Bank transfers 100 USD to an external recipient and the operation charges a 1 USD fee. Until an owner classifies the reason, the transfer is
provisionally an operating expense.

| Account                 | Debit | Credit |
| ----------------------- | ----: | -----: |
| Operating Expense       |   100 |        |
| Transaction Fee Expense |     1 |        |
| Cash — Bank             |       |    101 |

### Internal Transfer between Company Pockets — `INTERNAL`

The Safe transfers 100 USD to Bank. This changes the cash location but does not affect income, expenses, assets, or equity in aggregate.

| Account     | Debit | Credit |
| ----------- | ----: | -----: |
| Cash — Bank |   100 |        |
| Cash — Safe |       |    100 |

### Unclassified Bank or Safe Outflow — `CASH-OUT`

Bank sends 100 USD to an external address and no manual classification is available yet.

| Account           | Debit | Credit |
| ----------------- | ----: | -----: |
| Operating Expense |   100 |        |
| Cash — Bank       |       |    100 |

This is a visible provisional classification and is marked as needing off-chain data. It is not evidence that every external transfer is an
operating expense.

## Classified Bank and Safe Entries

An owner can classify a Bank or Safe movement only when its counterparty is external. A movement between known company pockets remains the
`INTERNAL` entry above and cannot be reclassified.

### Classified Revenue Inflow — `CASH-IN`

An owner classifies a 100 USD Bank deposit as revenue.

| Account         | Debit | Credit |
| --------------- | ----: | -----: |
| Cash — Bank     |   100 |        |
| Service Revenue |       |    100 |

### Classified Owner-Capital Inflow — `CASH-IN`

An owner classifies a 100 USD Bank deposit as capital contributed without SHER.

| Account       | Debit | Credit |
| ------------- | ----: | -----: |
| Cash — Bank   |   100 |        |
| Owner Capital |       |    100 |

### Classified Owner-Capital Withdrawal — `CASH-OUT`

An owner classifies a 100 USD Bank withdrawal as a return of previously contributed capital.

| Account       | Debit | Credit |
| ------------- | ----: | -----: |
| Owner Capital |   100 |        |
| Cash — Bank   |       |    100 |

### Classified Shareholder-Loan Inflow — `CASH-IN`

The company receives a 100 USD shareholder loan.

| Account      | Debit | Credit |
| ------------ | ----: | -----: |
| Cash — Bank  |   100 |        |
| Loan Payable |       |    100 |

### Classified Shareholder-Loan Repayment — `CASH-OUT`

The company repays 100 USD of a shareholder loan.

| Account      | Debit | Credit |
| ------------ | ----: | -----: |
| Loan Payable |   100 |        |
| Cash — Bank  |       |    100 |

### Classified Operating Expense — `CASH-OUT`

An owner classifies a 100 USD Bank or Safe outflow as an operating expense.

| Account           | Debit | Credit |
| ----------------- | ----: | -----: |
| Operating Expense |   100 |        |
| Cash — Bank/Safe  |       |    100 |

### Classified Payroll Expense — `CASH-OUT`

An owner classifies a 100 USD Bank or Safe outflow as a payroll payment.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Payroll Expense  |   100 |        |
| Cash — Bank/Safe |       |    100 |

### Classified Interest Expense — `CASH-OUT`

An owner classifies a 100 USD Bank or Safe outflow as interest.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Interest Expense |   100 |        |
| Cash — Bank/Safe |       |    100 |

### Classified Dividend — `CASH-OUT`

An owner classifies a 100 USD Bank or Safe outflow as a dividend.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Dividend Expense |   100 |        |
| Cash — Bank/Safe |       |    100 |

## Payroll, Expense, and Dividend Entries

### Weekly Wage Accrual — `UC-CASH-02`

At the end of an eligible work week, a member has earned 100 USD in cash compensation and 40 USD in SHER compensation.

| Account                    | Debit | Credit |
| -------------------------- | ----: | -----: |
| Payroll Expense            |   100 |        |
| Deferred SHER Compensation |    40 |        |
| Wage Payable               |       |    100 |
| SHERS To Be Issued         |       |     40 |

The cash part creates the wage liability. The SHER part is a non-cash equity movement and does not create Payroll Expense or Wage Payable.

### Wage Settlement — `UC-CASH-03`

The member withdraws the 100 USD cash wage and receives the 40 USD SHER compensation that was previously accrued.

| Account            | Debit | Credit |
| ------------------ | ----: | -----: |
| Wage Payable       |   100 |        |
| SHERS To Be Issued |    40 |        |
| Cash — Payroll     |       |    100 |
| Investor Equity    |       |     40 |

### Approved Expense Payout — `UC-EXP-01`

The Expense Account pays an approved 100 USD expense to an external recipient.

| Account           | Debit | Credit |
| ----------------- | ----: | -----: |
| Operating Expense |   100 |        |
| Cash — Expense    |       |    100 |

### Dividend Paid — `UC-INV-01`

InvestorV1 pays a shareholder a 100 USD dividend.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Dividend Expense |   100 |        |
| Cash — Bank      |       |    100 |

## Community Credit Entries

### Funded Community Credit Principal — `UC-CREDIT-01`

A Community Credit round funds and 100 USD of principal reaches Bank.

| Account      | Debit | Credit |
| ------------ | ----: | -----: |
| Cash — Bank  |   100 |        |
| Loan Payable |       |    100 |

`FundsLent` is only a lender pledge to an external contract. It has no company `JournalEntry` before the offer funds. An unfunded offer's
refund likewise has no entry because the company never recognized the principal.

### Fixed Return Recognized — `UC-CREDIT-05`

When the funded round fixes a 10 USD return owed to lenders, the company recognizes the obligation.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Interest Expense |    10 |        |
| Interest Payable |       |     10 |

### Community Credit Repayment — `UC-CREDIT-03`

The company repays 80 USD of principal and 10 USD of an already accrued fixed return in one repayment operation.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Loan Payable     |    80 |        |
| Interest Payable |    10 |        |
| Cash — Bank      |       |     90 |

### Community Credit Interest Paid without a Prior Accrual — `UC-CREDIT-03`

If the source feed could not recognize the fixed return at funding time, paying 10 USD of interest records the expense at payment time.

| Account          | Debit | Credit |
| ---------------- | ----: | -----: |
| Interest Expense |    10 |        |
| Cash — Bank      |       |     10 |

`UC-CREDIT-02` and `UC-CREDIT-04` remain declared legacy use-case identifiers, but no current mapper emits them. They do not have a
generated `JournalEntry` template.

## SHER Issuance and Vesting Entries

### Direct SHER Mint — `DEFAULT-D`

An Investor `Minted` event for 100 USD of SHER is not backed by a router deposit, wage withdrawal, or vesting release.

| Account            | Debit | Credit |
| ------------------ | ----: | -----: |
| SHERS To Be Issued |   100 |        |
| Investor Equity    |       |    100 |

### Vesting Grant — `UC-VEST-01`

The company creates a vesting schedule with a 100 USD SHER award.

| Account                    | Debit | Credit |
| -------------------------- | ----: | -----: |
| Deferred SHER Compensation |   100 |        |
| SHERS To Be Issued         |       |    100 |

### Vested SHER Release — `UC-VEST-02`

The company releases and mints 40 USD of vested SHER.

| Account            | Debit | Credit |
| ------------------ | ----: | -----: |
| SHERS To Be Issued |    40 |        |
| Investor Equity    |       |     40 |

### Vesting Stop — `UC-VEST-03`

The company stops a vesting schedule and cancels its 60 USD unvested remainder.

| Account                    | Debit | Credit |
| -------------------------- | ----: | -----: |
| SHERS To Be Issued         |    60 |        |
| Deferred SHER Compensation |       |     60 |

The `Minted` event emitted by a router investment, SHER wage withdrawal, or vesting release is already represented by its backing use case
and is not booked again as `DEFAULT-D`.

## Operation Boundaries and Known Gaps

The intended invariant is one economic operation to one complete `JournalEntry`. Current mappers meet this boundary for a Bank transfer and
its fee, a weekly payroll accrual with several wage rates, and funded Community Credit principal from several lenders.

Cash and SHER wage settlement, dividend distribution, credit repayment with principal and interest, and vesting stop still need every mapper
to propagate the shared source-operation identity. Their complete examples above describe the required journal entries, but related postings
can currently remain separate entries.

The fee invariant is not yet enforced by the source mapper: a `FeePaid` log without a matching transfer can currently produce a standalone
fee entry. This contradicts the rule in this catalogue and must be corrected before the Accounting source-operation migration can close.

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
