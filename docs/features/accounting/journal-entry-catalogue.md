# Accounting Use Cases, Posting Rules, and Journal Entries

**Scope:** Events that produce company accounting entries, mapped from user stories to economic use cases and posting rules

**Status:** Proposed catalogue model; current-runtime correspondence is documented separately below

**Last reviewed:** Not yet reviewed

This catalogue covers **events that produce accounting entries** and follows **user story → accounting use case → applicable rules → journal
entry**. Transaction feature documentation owns user actions and permissions. This document owns their accounting interpretation. The
[Accounting Read Model](../../implementation/accounting-read-model/README.md) owns shared implementation mechanics.

The `UC-<DOMAIN>-<NNN>` and `RULE-*` identifiers below define the proposed model, not current runtime values. Domain posting examples
preserve existing behaviour unless a change is explicitly identified. Separating use cases from reusable rules and introducing suspense
accounts require a runtime migration. See
[Runtime Correspondence and Migration Boundaries](#runtime-correspondence-and-migration-boundaries) before interpreting these examples as
implemented behaviour. The [manual validation script](./accounting-test-script.md) checks this target.

## Reading the Catalogue

An event belongs in this catalogue when its economic effect requires a debit/credit entry in the company's books. This criterion applies to
transfers, expenses, obligations, contributions, and share commitments or issuances. Events that change only authority, configuration, or
workflow status have no use case here unless they produce an accounting entry. Cash movement is one possible accounting effect.

| Concept             | Question answered                          | Responsibility                                                   |
| ------------------- | ------------------------------------------ | ---------------------------------------------------------------- |
| User story          | What does the user do?                     | Product action, permissions, and acceptance criteria             |
| Accounting use case | What economic event occurred?              | Trigger, business evidence, counter-accounts, and domain posting |
| Posting rule        | Which debits and credits are recorded?     | Domain posting definition and applicable movement treatment      |
| Journal entry       | What is recorded for the source operation? | Group compatible postings into one balanced entry                |

- One story can select several use cases depending on operation evidence. One use case can serve several stories.
- A use case defines its rules and conditions. A movement rule alone does not establish revenue, expense, capital, or debt.
- `RULE-INTERNAL` and `RULE-EXTERNAL` classify each non-fee cash movement. `RULE-FEE` can accompany either for a confirmed Bank fee.
- A source operation can contain several movements and use cases. Compatible postings remain separately traceable within its single journal
  entry. A workflow involving several transactions creates separate entries for those transactions.
- Every included use case defines an accounting entry and its posting rules. Wage accrual, interest recognition, share issuance, and Vesting
  qualify because they produce debit/credit entries.
- Every journal entry balances. Account and currency filters retain the complete entry, not isolated lines.

Examples use illustrative USD values. Each monetary line also retains original currency, quantity, and rate of record. A cash pocket is a
company-controlled account with an evidenced deployment identity; a member's personal wallet is not a company pocket.

## Identifier Convention

| Kind                   | Format              | Example          | Use                                                                      |
| ---------------------- | ------------------- | ---------------- | ------------------------------------------------------------------------ |
| Economic use case      | `UC-<DOMAIN>-<NNN>` | `UC-PAYROLL-001` | A defined economic scenario with source stories and a posting definition |
| Reusable movement rule | `RULE-<KIND>`       | `RULE-INTERNAL`  | A movement treatment applied by several use cases                        |

Domains describe economic meaning, not the emitting contract. Sequences are local to each domain. There is no `COMP-*` family: fees use
`RULE-FEE` within the parent operation. Pending-classification receipts and payments have their own treasury use cases and apply
`RULE-EXTERNAL`; that rule is also used by identified business events.

## Posting Rule Reference

### `RULE-INTERNAL` — Company-Pocket Movement

- **Applies when:** Both sides of a confirmed cash movement resolve to company-controlled pockets.
- **Posting:** Debit destination cash; credit source cash for the same token quantity and value.
- **Evidence:** Resolve both deployment accounts and remove complementary mirrored evidence for that movement.
- **Business effect:** The transfer alone creates no revenue or expense. A separately confirmed fee can create an expense.
- **Precedence:** Do not add a generic transfer posting when a more specific use case already owns the same movement.

### `RULE-EXTERNAL` — Movement Across the Company Boundary

- **Applies when:** Confirmed cash enters from or leaves to a party outside the company's cash pockets.
- **Direction `in`:** Debit receiving cash; credit the counter-account defined by the use case.
- **Direction `out`:** Debit the counter-account defined by the use case; credit paying cash.
- **Business evidence:** An external address alone establishes neither revenue nor expense. Use the business event's counter-account, or a
  pending-classification treasury use case when no supported purpose can be established.
- **Scope:** `in` and `out` are directions of one rule, not separate identifiers. Share issuance has its own domain posting rule.

### `RULE-FEE` — Confirmed Bank Transaction Fee

- **Applies when:** Generation-aware fee evidence matches a Bank outflow in the same source operation.
- **Posting:** Debit Transaction Fee Expense; credit the exact Bank cash account for the confirmed fee amount.
- **Composition:** Attach these lines to the parent operation applying `RULE-INTERNAL` or `RULE-EXTERNAL`; do not create a standalone fee
  entry.
- **Evidence:** Normalize legacy Bank and current FeeCollector evidence; withhold unmatched fees and report incomplete evidence.
- **Boundary:** Safe transfers do not generate the Bank protocol fee. Do not infer fees from balance differences, gas costs, or loan
  interest. Community Credit fixed return has its own interest-recognition use case.

`RULE-INTERNAL`, `RULE-EXTERNAL`, and `RULE-FEE` define reusable treasury treatments within a use case's posting rules. Each use case also
specifies its account recognition or settlement rule: wage accrual, interest recognition, share issuance, grant recognition, release, or
cancellation. The mapping below names the rules that generate the entry, rather than using cash movement as the inclusion criterion.

## Story-to-Use-Case Map

Each row is a conditional outcome. Stories keep their canonical IDs; accounting IDs below are proposed. `fee?` means `RULE-FEE` only when
confirmed for a Bank outflow in the same operation. The posting-rule column identifies the applicable movement treatment and/or the account
recognition or settlement rule defined by the use case.

| User story                                                                                          | Condition / posting moment                                                        | Accounting use case                                      | Posting rules                                          |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank)                                      | External receipt without business-purpose evidence                                | `UC-TREASURY-002`                                        | `RULE-EXTERNAL` in                                     |
| [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank)                                      | Receipt from another company pocket                                               | `UC-TREASURY-001`                                        | `RULE-INTERNAL`                                        |
| [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds)                                | Transfer to a company pocket                                                      | `UC-TREASURY-001`                                        | `RULE-INTERNAL`, fee?                                  |
| [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds)                                | External payment with valid operating-expense evidence or classification          | `UC-EXPENSE-001`                                         | `RULE-EXTERNAL` out, fee?                              |
| [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds)                                | External payment without established purpose                                      | `UC-TREASURY-003`                                        | `RULE-EXTERNAL` out, fee?                              |
| [US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds)                  | Sweep step into Bank                                                              | `UC-TREASURY-001`                                        | `RULE-INTERNAL`                                        |
| [US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds)                  | Final external payment without established purpose                                | `UC-TREASURY-003`                                        | `RULE-EXTERNAL` out, fee?                              |
| [US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds)                  | Final external payment with valid operating-expense evidence or classification    | `UC-EXPENSE-001`                                         | `RULE-EXTERNAL` out, fee?                              |
| [US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account)                       | Approved external payout                                                          | `UC-EXPENSE-001`                                         | `RULE-EXTERNAL` out                                    |
| [US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account)                       | Transfer to a company pocket                                                      | `UC-TREASURY-001`                                        | `RULE-INTERNAL`                                        |
| [US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds)                                  | Transfer to or from a company pocket                                              | `UC-TREASURY-001`                                        | `RULE-INTERNAL`                                        |
| [US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds)                                  | External receipt without established purpose                                      | `UC-TREASURY-002`                                        | `RULE-EXTERNAL` in                                     |
| [US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds)                                  | External payment without established purpose                                      | `UC-TREASURY-003`                                        | `RULE-EXTERNAL` out                                    |
| [US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds)                                  | External payment with valid operating-expense classification                      | `UC-EXPENSE-001`                                         | `RULE-EXTERNAL` out                                    |
| [US-PAYROLL-003](../payroll/README.md#us-payroll-003-fund-the-payroll-contract)                     | Company funds reach Payroll from another pocket                                   | `UC-TREASURY-001`                                        | `RULE-INTERNAL`, fee? for Bank                         |
| [US-PAYROLL-005](../payroll/README.md#us-payroll-005-submit-a-daily-claim)                          | Containing work week ends while eligible                                          | `UC-PAYROLL-001`                                         | Wage accrual                                           |
| [US-PAYROLL-009](../payroll/README.md#us-payroll-009-disable-or-re-enable-a-signed-weekly-claim)    | Status determines ended-week accrual eligibility; no separate status-change entry | `UC-PAYROLL-001`                                         | Wage accrual                                           |
| [US-PAYROLL-010](../payroll/README.md#us-payroll-010-withdraw-an-approved-weekly-claim)             | Confirmed withdrawal settles cash wages and/or SHER wages                         | `UC-PAYROLL-002`                                         | `RULE-EXTERNAL` out for cash; share issuance for SHER  |
| [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round)                          | Round becomes funded                                                              | `UC-CREDIT-001`; `UC-CREDIT-002` if interest is non-zero | `RULE-EXTERNAL` in for principal; interest recognition |
| [US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round)                        | Positive partial raise is accepted                                                | `UC-CREDIT-001`; `UC-CREDIT-002` if interest is non-zero | `RULE-EXTERNAL` in for principal; interest recognition |
| [US-CC-005](../community-credit/README.md#us-cc-005-repay-lenders)                                  | Confirmed principal/interest repayment                                            | `UC-CREDIT-003`                                          | `RULE-EXTERNAL` out                                    |
| [US-SHER-001](../shareholder-management/README.md#us-sher-001-invest-in-the-safe-and-receive-sher)  | Confirmed router investment backs a SHER mint                                     | `UC-EQUITY-001`                                          | `RULE-EXTERNAL` in                                     |
| [US-SHER-002](../shareholder-management/README.md#us-sher-002-distribute-dividends-to-shareholders) | Confirmed shareholder payments                                                    | `UC-EQUITY-002`                                          | `RULE-EXTERNAL` out                                    |
| [US-SHER-004](../shareholder-management/README.md#us-sher-004-issue-sher-to-a-shareholder)          | Direct mint not owned by investment, Payroll, or Vesting                          | `UC-EQUITY-003`                                          | Share issuance                                         |
| [US-VESTING-001](../vesting/README.md#us-vesting-001-create-a-minute-precise-vesting-schedule)      | Restricted-stock grant created                                                    | `UC-VESTING-001`                                         | Grant recognition                                      |
| [US-VESTING-003](../vesting/README.md#us-vesting-003-release-accrued-shares)                        | Accrued shares released                                                           | `UC-VESTING-002`                                         | Vesting release                                        |
| [US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule)               | Stop releases accrued shares and/or cancels unvested remainder                    | `UC-VESTING-002` and/or `UC-VESTING-003`                 | Vesting release and/or grant cancellation              |

A specific business event takes precedence over a pending-classification use case. A router-backed Safe receipt belongs to `UC-EQUITY-001`,
not also `UC-TREASURY-002`. An evidenced expense replaces `UC-TREASURY-003` with `UC-EXPENSE-001` for the same cash movement. Account
assignments alone do not prove a Payroll settlement, loan repayment, or dividend: those use cases require their own business evidence. Do
not force an unsupported purpose into a supported use case.

### Events Without Accounting Entries

These boundaries explain why the actions below do not create accounting use cases of their own. A later economic event is mapped above when
it produces an entry.

| Source stories / action                                                                                                                                              | Accounting boundary                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [US-EXP-001](../accounts/README.md#us-exp-001-grant-a-signed-spending-approval), [US-EXP-003](../accounts/README.md#us-exp-003-deactivate-or-reactivate-an-approval) | Spending authority creates no entry; actual spending posts                       |
| [US-PAYROLL-006](../payroll/README.md#us-payroll-006-edit-a-daily-claim), [US-PAYROLL-007](../payroll/README.md#us-payroll-007-delete-a-daily-claim)                 | Edits before week end change the future accrual amount; no separate operation    |
| [US-PAYROLL-008](../payroll/README.md#us-payroll-008-sign-a-completed-weekly-claim)                                                                                  | Signing enables withdrawal; it is not the accrual trigger                        |
| [US-CC-002](../community-credit/README.md#us-cc-002-publish-a-credit-call)                                                                                           | Publishing terms creates no funded-loan entry                                    |
| [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round), [US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round)             | Open-round contributions and refunds before funding remain outside company books |
| [US-SHER-006](../shareholder-management/README.md#us-sher-006-claim-a-migrated-shareholding)                                                                         | Migrated ownership is not new issuance or capital                                |

## Treasury Use Cases

### `UC-TREASURY-001` — Internal Company-Pocket Transfer

**Source stories:** `US-BANK-001`, `US-BANK-002`, `US-BANK-004`, `US-EXP-002`, `US-SAFE-003`, and `US-PAYROLL-003`; links and conditions
appear in the story map above.

- **Trigger and evidence:** Confirmed cash moves between two company pockets, with no more specific business event owning that movement.
- **Rules:** `RULE-INTERNAL`; add `RULE-FEE` only for an independently confirmed Bank fee.
- **Domain posting:** Actual source/destination deployments determine the cash accounts. Bank, Safe, Payroll, and Expense share the same
  economic interpretation; complementary movement evidence is deduplicated.
- **Journal result:** One internal-transfer entry. The transfer itself has no income-statement effect; a confirmed fee remains an expense.

For $100 moved from Safe to Payroll:

| Account        | Debit (USD) | Credit (USD) |
| -------------- | ----------: | -----------: |
| Cash — Payroll |         100 |              |
| Cash — Safe    |             |          100 |

For $100 received by Payroll from Bank with a confirmed $1 fee:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Cash — Payroll          |         100 |              |
| Transaction Fee Expense |           1 |              |
| Cash — Bank             |             |          101 |

### `UC-TREASURY-002` — External Receipt Pending Classification

**Source stories:** [US-BANK-001](../accounts/README.md#us-bank-001-fund-the-bank) and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds).

- **Trigger and evidence:** External cash reaches Bank or Safe without evidence establishing a supported business purpose.
- **Rules:** `RULE-EXTERNAL`, direction `in`.
- **Domain posting:** Credit the proposed Unclassified Receipts account until evidence supplies a business use case and counter-account.
  Sender member/founder role alone establishes neither revenue nor capital.
- **Journal result:** One receipt pending classification; later classification reuses its cash movement instead of duplicating it.
- **Implementation boundary:** Suspense treatment is proposed. Current direct external receipts credit Service Revenue.

For an unidentified $100 external Bank receipt:

| Account               | Debit (USD) | Credit (USD) |
| --------------------- | ----------: | -----------: |
| Cash — Bank           |         100 |              |
| Unclassified Receipts |             |          100 |

### `UC-TREASURY-003` — External Payment Pending Classification

**Source stories:** [US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds),
[US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds), and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds).

- **Trigger and evidence:** Cash leaves Bank or Safe for an external recipient without evidence establishing a supported business purpose.
- **Rules:** `RULE-EXTERNAL`, direction `out`; add `RULE-FEE` only for a confirmed Bank fee.
- **Domain posting:** Debit the proposed Unclassified Payments account until evidence supplies a business use case and counter-account.
- **Journal result:** One pending-classification payment with any matched fee. Classification does not duplicate the cash movement.
- **Implementation boundary:** Current unassigned payments provisionally debit Operating Expense. Suspense accounts and their classification
  lifecycle require implementation.

For an unidentified $80 Safe payment:

| Account               | Debit (USD) | Credit (USD) |
| --------------------- | ----------: | -----------: |
| Unclassified Payments |          80 |              |
| Cash — Safe           |             |           80 |

## Payroll and Expense Use Cases

### `UC-PAYROLL-001` — Weekly Wage Accrual

**Source stories:** [US-PAYROLL-005](../payroll/README.md#us-payroll-005-submit-a-daily-claim) and
[US-PAYROLL-009](../payroll/README.md#us-payroll-009-disable-or-re-enable-a-signed-weekly-claim).

- **Rules:** The domain accrual rule recognizes earned cash wages against Wage Payable and earned SHER wages against SHERS To Be Issued
  without moving cash.
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

### `UC-PAYROLL-002` — Wage Settlement

**Source story:** [US-PAYROLL-010](../payroll/README.md#us-payroll-010-withdraw-an-approved-weekly-claim).

- **Rules:** `RULE-EXTERNAL`, direction `out`, for cash wages. The share-issuance rule settles promised shares into Investor Equity. Do not
  expense wages again.
- **Input:** A Payroll withdrawal event enriched with the matching weekly claim.
- **Processing:** Cash and SHER settlement paths are distinguished by currency. Portions in the same transaction share one entry; separate
  withdrawals remain separate operations. A matching Investor mint from SHER settlement is removed as duplicate evidence.
- **General Ledger:** Label `Wage settlement`; activity `Payroll: Withdraw`; the transaction hash traces the settlement.

For settlement of $80 in cash wages and $20 in SHER wages in one operation:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| Wage Payable       |          80 |              |
| SHERS To Be Issued |          20 |              |
| Cash — Payroll     |             |           80 |
| Investor Equity    |             |           20 |

### `UC-EXPENSE-001` — Operating Expense Payment

**Source stories:** [US-EXP-002](../accounts/README.md#us-exp-002-spend-from-the-expense-account); also
[US-BANK-002](../accounts/README.md#us-bank-002-transfer-bank-funds),
[US-BANK-004](../accounts/README.md#us-bank-004-cash-out-available-treasury-funds), and
[US-SAFE-003](../accounts/README.md#us-safe-003-manage-safe-funds) when their payment has valid operating-expense evidence or
classification.

- **Rules:** `RULE-EXTERNAL`, direction `out`; add `RULE-FEE` only for a confirmed Bank fee. The domain rule debits Operating Expense when
  supported business evidence identifies the payment.
- **Input:** An Expense Account transfer to an external recipient and its approved portal budget when available, or a Bank/Safe external
  payment validly classified as an operating expense.
- **Processing:** For approved Expense payouts, the mapper reconstructs the approval cap and remaining amount for the operation. When
  indexed payout events are entirely unavailable, the approved record's current drawn balance supplies one synthetic fallback entry per
  budget. An internal destination uses `UC-TREASURY-001` instead. Bank/Safe payments require evidence establishing the operating-expense
  counter-account.
- **General Ledger:** Proposed label `Operating expense`; activity links to the owning Expense, Bank, or Safe journey. Indexed entries
  retain their transaction hash; fallback entries identify their synthetic source.

For a $100 approved payout to an external recipient:

| Account           | Debit (USD) | Credit (USD) |
| ----------------- | ----------: | -----------: |
| Operating Expense |         100 |              |
| Cash — Expense    |             |          100 |

For an $80 Bank operating-expense payment with a confirmed $2 fee, the same use case applies `RULE-EXTERNAL` out and `RULE-FEE`:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Operating Expense       |          80 |              |
| Transaction Fee Expense |           2 |              |
| Cash — Bank             |             |           82 |

Approved Expense payouts currently use `UC-EXP-01`; classified Bank/Safe payments remain `CASH-OUT`. Unifying their economic identifier
requires migration. Creating, deactivating, or reactivating an approval changes spending authority but moves no money, so it creates no
journal entry.

## Community Credit Use Cases

### `UC-CREDIT-001` — Funded Principal

**Source stories:** [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round) and
[US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round).

- **Rules:** `RULE-EXTERNAL`, direction `in`. Lender funds are external financing even if delivered through the credit contract; do not also
  book their delivery to Bank as a generic pocket transfer.
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

### `UC-CREDIT-002` — Fixed Return Recognized

**Source stories:** [US-CC-003](../community-credit/README.md#us-cc-003-lend-to-an-open-round) and
[US-CC-004](../community-credit/README.md#us-cc-004-resolve-a-stalled-round).

- **Rules:** The domain interest-accrual rule debits Interest Expense and credits Interest Payable when funded. Fixed return is not
  `RULE-FEE`; zero interest creates no interest lines.
- **Input:** The funded principal and the offer's flat-interest terms.
- **Processing:** Accounting calculates each lender's fixed return when the round becomes funded. This synthetic obligation is grouped by
  lender but remains traceable to the funded offer.
- **General Ledger:** The interest lines share the funding operation with `UC-CREDIT-001`; the current primary label is
  `Credit interest owed`. The obligation is visible before cash repayment without creating a second funding entry.

For a $10 fixed return recognized when the round funds:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Interest Expense |          10 |              |
| Interest Payable |             |           10 |

### `UC-CREDIT-003` — Principal and Interest Repaid

**Source story:** [US-CC-005](../community-credit/README.md#us-cc-005-repay-lenders).

- **Rules:** `RULE-EXTERNAL`, direction `out`. The domain settlement rule selects Loan Payable, Interest Payable, or Interest Expense from
  the recognized obligations.
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

### `UC-EQUITY-001` — Investor Contribution

**Source story:** [US-SHER-001](../shareholder-management/README.md#us-sher-001-invest-in-the-safe-and-receive-sher).

- **Rules:** `RULE-EXTERNAL`, direction `in`. Investment evidence establishes Investor Equity as the counter-account, rather than revenue or
  an unidentified receipt.
- **Input:** A SafeDepositRouter deposit, its Safe receipt, and the matching Investor mint.
- **Processing:** The router operation owns the accounting entry. Matching Safe transfer and Investor mint evidence are removed so the
  investment is neither revenue nor a second share issuance.
- **General Ledger:** Label `Investor contribution`; activity links to the shareholder investment journey.

For a router investment valued at $100:

| Account         | Debit (USD) | Credit (USD) |
| --------------- | ----------: | -----------: |
| Cash — Safe     |         100 |              |
| Investor Equity |             |          100 |

### `UC-EQUITY-002` — Dividend Paid

**Source story:** [US-SHER-002](../shareholder-management/README.md#us-sher-002-distribute-dividends-to-shareholders).

- **Rules:** `RULE-EXTERNAL`, direction `out`. Preserve the current Dividend Expense counter-account; this refactor does not change the
  dividend accounting policy.
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

### `UC-EQUITY-003` — Direct SHER Issuance

**Source story:** [US-SHER-004](../shareholder-management/README.md#us-sher-004-issue-sher-to-a-shareholder).

- **Rules:** The domain issuance rule debits SHERS To Be Issued and credits Investor Equity for the issued shares.
- **Input:** An Investor `Minted` event not matched to a router investment, Payroll settlement, or Vesting release.
- **Processing:** Known backed mint paths are removed first. Only the remaining direct mint uses this default rule.
- **General Ledger:** Label `Share issuance`; activity links to the shareholder journey.

For directly issued SHER valued at $100:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| SHERS To Be Issued |         100 |              |
| Investor Equity    |             |          100 |

Shareholder migration claims are ownership migration evidence, not new issuance, and do not create this entry.

### `UC-VESTING-001` — Vesting Grant

**Source story:** [US-VESTING-001](../vesting/README.md#us-vesting-001-create-a-minute-precise-vesting-schedule).

- **Rules:** The domain grant rule recognizes the full restricted-stock commitment in Deferred SHER Compensation and SHERS To Be Issued
  without minting.
- **Input:** A vesting-schedule creation event with beneficiary, grant, and schedule identity.
- **Processing:** The full restricted-stock commitment is recognized when defined; no shares are minted at this point.
- **General Ledger:** Label `Vesting grant`; activity links to Vesting. The entry affects equity accounts, not profit.

For a restricted-stock grant valued at $100:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| Deferred SHER Compensation |         100 |              |
| SHERS To Be Issued         |             |          100 |

### `UC-VESTING-002` — Vested SHER Released

**Source stories:** [US-VESTING-003](../vesting/README.md#us-vesting-003-release-accrued-shares) and
[US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule).

- **Rules:** The domain release rule settles SHERS To Be Issued into Investor Equity for the released shares.
- **Input:** A vesting release event and its matching Investor mint.
- **Processing:** The Vesting event owns the entry; the matching Investor mint is removed. A stop may release accrued shares in the same
  transaction.
- **General Ledger:** Label `Vesting released`; activity links to the affected schedule.

For released SHER valued at $40:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| SHERS To Be Issued |          40 |              |
| Investor Equity    |             |           40 |

### `UC-VESTING-003` — Unvested Grant Cancelled

**Source story:** [US-VESTING-004](../vesting/README.md#us-vesting-004-stop-an-active-vesting-schedule).

- **Rules:** The domain cancellation rule reverses only the unvested remainder into Deferred SHER Compensation; same-operation releases are
  not reversed twice.
- **Input:** A vesting stop event and the schedule's unvested remainder.
- **Processing:** Accounting reverses only the stopped schedule's unvested quantity. If nothing remains, no cancellation lines are posted.
  Any same-transaction accrued release is grouped with `UC-VESTING-002`.
- **General Ledger:** A cancellation-only operation is labelled `Vesting stopped`. When the stop also releases accrued shares, both use
  cases remain one complete entry under the primary release-or-stop label.

For cancellation of an unvested remainder valued at $60:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| SHERS To Be Issued         |          60 |              |
| Deferred SHER Compensation |             |           60 |

If one stop releases $40 and cancels $60, both use cases share this complete entry:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| SHERS To Be Issued         |         100 |              |
| Investor Equity            |             |           40 |
| Deferred SHER Compensation |             |           60 |

The focused [Vesting accounting policy](./vesting-accounting-restricted-stock.md) explains why these entries remain outside the income
statement.

## Journal Assembly and General Ledger Output

```mermaid
flowchart LR
    Story[User story and scenario conditions] --> Evidence[Confirmed operation evidence]
    Evidence --> UC[Select economic use case or use cases]
    UC --> Rules[Apply use-case posting rules]
    Rules --> Reconcile[Resolve accounts and values; remove mirrors]
    Reconcile --> Group[Group compatible postings by source operation]
    Group --> Validate[Validate one balanced JournalEntry]
    Validate --> Ledger[Project complete General Ledger rows]
```

Applying a rule adds postings inside an operation, not another transaction. On-chain entries use their transaction hash as the
source-operation identity. Synthetic entries, such as weekly accruals, use deterministic portal identities without a fabricated transaction
hash. The current entry label comes from its primary non-fee draft while every compatible line remains visible.

## Shared General Ledger Rules

- The first visible row carries the operation date, label, transaction hash when present, activity, and action category. Every row carries
  its concrete account, debit or credit amount, currency, quantity, and rate.
- Action categories are derived from the finalized accounts and use case, not copied from a source event label.
- Redeployed cash accounts remain distinct concrete rows. General Ledger and Trial Balance navigation preserves that deployment identity.
- Memo-only operations explain incomplete economic evidence but do not invent debit or credit lines.
- A source feed marked loading, partial, or failed withholds final reports. A missing timestamp is never replaced with epoch time, and a
  missing valuation is never replaced with a current price.

## Runtime Correspondence and Migration Boundaries

The current runtime `UseCase` type mixes economic events, generic movements, and fees. This map and the compatibility sections below retain
their actual meaning and existing documentation anchors. They do not prove that the target identifiers or rule association are deployed.

| Current emitted identifier               | Target use case / rule                                              | Boundary                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `UC-BANK-02`                             | `UC-TREASURY-002` + `RULE-EXTERNAL` in when purpose is unidentified | Current direct receipts credit Service Revenue; target suspense changes behaviour |
| `UC-BANK-03`, `INTERNAL`                 | `UC-TREASURY-001` + `RULE-INTERNAL`                                 | Source-independent economic identity is proposed                                  |
| `CASH-OUT`                               | `UC-TREASURY-003` or an evidenced domain UC + `RULE-EXTERNAL` out   | Current fallback debits Operating Expense; proposed fallback uses suspense        |
| `FEE`                                    | `RULE-FEE` within the parent use case                               | Current finalization already attaches matched fees and withholds orphans          |
| `UC-CASH-02`                             | `UC-PAYROLL-001`, wage-accrual rule                                 | Preserve ended-week eligibility and compensation obligations                      |
| `UC-CASH-03`                             | `UC-PAYROLL-002`, cash-out and/or share-issuance rule               | Preserve settlement and backed-mint deduplication                                 |
| `UC-EXP-01`                              | `UC-EXPENSE-001` + `RULE-EXTERNAL` out                              | Bank/Safe expense classifications currently remain `CASH-OUT`                     |
| `UC-CREDIT-01`                           | `UC-CREDIT-001` + `RULE-EXTERNAL` in                                | Preserve funded principal                                                         |
| `UC-CREDIT-05`                           | `UC-CREDIT-002`, interest-recognition rule                          | Preserve fixed return owed                                                        |
| `UC-CREDIT-03`                           | `UC-CREDIT-003` + `RULE-EXTERNAL` out                               | Preserve principal/interest repayment                                             |
| `UC-SDR-01`                              | `UC-EQUITY-001` + `RULE-EXTERNAL` in                                | Preserve ownership of investment evidence                                         |
| `UC-INV-01`                              | `UC-EQUITY-002` + `RULE-EXTERNAL` out                               | Preserve current dividend policy                                                  |
| `DEFAULT-D`                              | `UC-EQUITY-003`, share-issuance rule                                | Preserve direct issuance after backed mints are removed                           |
| `UC-VEST-01`, `UC-VEST-02`, `UC-VEST-03` | `UC-VESTING-001`, `UC-VESTING-002`, `UC-VESTING-003`                | Preserve grant, release, and cancellation                                         |

Migration must introduce the new identifiers and rule associations, define suspense accounts and supported classification flows, and align
labels, action categories, activity destinations, and representative tests. This documentation refactor changes no runtime or story
acceptance status. Target suspense scenarios remain blocked for manual validation until implemented.

### `UC-BANK-02` — External Cash Receipt

Current direct Bank/Safe receipts debit receiving cash and credit Service Revenue, labelled `Service revenue`. Router-backed receipts are
removed because `UC-SDR-01` owns them. Target `UC-TREASURY-002` suspense treatment changes this behaviour.

### `UC-BANK-03` — Bank Funds a Company Pocket

Current Bank funding debits destination cash and credits Bank cash, labelled `Treasury funding`; matched fees share the entry. Target
`UC-TREASURY-001` applies `RULE-INTERNAL` and conditional `RULE-FEE`.

### `INTERNAL` — Other Company-Pocket Transfer

Current other pocket movements debit destination cash and credit source cash, labelled `Internal transfer`. Target `UC-TREASURY-001` uses
the same economic identity as Bank funding; Safe movements generate no Bank protocol fee.

### `CASH-OUT` — External Bank or Safe Payment

Current unassigned payments provisionally debit Operating Expense, labelled `Cash payment`. A valid account assignment may select Owner
Capital, Payroll Expense, Interest Expense, or Dividend Expense instead; compound entries remain read-only. Target suspense and
economic-use-case classification require migration.

### `FEE` — Transaction-Fee Component

This legacy identifier records matched fee evidence, not a standalone finalized operation. Its Transaction Fee Expense and Bank cash lines
attach to the parent outflow. Target `RULE-FEE` expresses that role without a component identifier family.

### `UC-CASH-02` — Weekly Wage Accrual

Current `Wage accrual` corresponds to target `UC-PAYROLL-001`: eligible ended-week cash and SHER amounts accrue without moving cash.

### `UC-CASH-03` — Wage Settlement

Current `Wage settlement` corresponds to target `UC-PAYROLL-002`: settle Wage Payable for cash and SHERS To Be Issued for issued shares.

### `UC-EXP-01` — Approved Expense Payout

Current `Operating expense` corresponds to the approved-payout scenario of `UC-EXPENSE-001`. Internal destinations use `INTERNAL`; approval
changes alone create no entry.

### `UC-CREDIT-01` — Funded Principal

Current funded principal corresponds to `UC-CREDIT-001`. Zero-interest funding is labelled `Credit funds lent`; compatible principal and
interest postings share the funding entry.

### `UC-CREDIT-05` — Fixed Return Recognized

Current `Credit interest owed` corresponds to `UC-CREDIT-002`. Interest is recognized when funded and grouped with principal; it is not a
transaction fee.

### `UC-CREDIT-03` — Principal and Interest Repaid

Current `Credit repayment` corresponds to `UC-CREDIT-003`. Recognized interest settles Interest Payable; previously unrecognized interest
debits Interest Expense.

### `UC-SDR-01` — Investor Contribution

Current `Investor contribution` corresponds to `UC-EQUITY-001`. Router evidence owns the investment; Safe receipts and backed Investor mints
are removed as mirrors.

### `UC-INV-01` — Dividend Paid

Current `Dividend paid` corresponds to `UC-EQUITY-002`, retaining the Dividend Expense counter-account.

### `DEFAULT-D` — Direct SHER Issuance

Current `Share issuance` corresponds to `UC-EQUITY-003`. Backed mints and migrated ownership do not create additional issuance.

### `UC-VEST-01` — Vesting Grant

Current `Vesting grant` corresponds to `UC-VESTING-001`: recognize the full restricted-stock commitment without minting.

### `UC-VEST-02` — Vested SHER Released

Current `Vesting released` corresponds to `UC-VESTING-002`: settle promised shares into equity and remove backed-mint mirrors.

### `UC-VEST-03` — Unvested Grant Cancelled

Current cancellation-only operations are labelled `Vesting stopped`, corresponding to `UC-VESTING-003`. Releases and cancellations in one
stop transaction share the primary release-or-stop label.

### Declared but Inactive Identifiers

The current type declares `UC-CREDIT-02`, `UC-CREDIT-04`, and `CASH-IN`, but no current mapper emits them; they do not prove implemented
coverage. The former `UC-BANK-01` founder-address inference was retired. These legacy values do not implicitly define other target use
cases.

## Implementation Evidence

**Implementation evidence reviewed against:** `f3144ed5dc47f4b21801535a79fd157177a3a545`

These sources support current-runtime correspondence and preserved domain postings, not implementation of proposed identifiers or suspense
accounts.

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
- [Accounting rule tests](../../../app/src/utils/accounting/__tests__/) and
  [contract-generation accounting tests](../../../app/src/composables/accounting/__tests__/useCNCAccounting.migration.spec.ts)

## Related Documentation

- [Accounting user stories](./README.md)
- [Accounting Read Model](../../implementation/accounting-read-model/README.md)
- [Manual validation script](./accounting-test-script.md)
- [Vesting accounting policy](./vesting-accounting-restricted-stock.md)
- [Accounts](../accounts/README.md)
- [Payroll](../payroll/README.md)
- [Community Credit](../community-credit/README.md)
- [Shareholder Management](../shareholder-management/README.md)
- [Vesting](../vesting/README.md)
