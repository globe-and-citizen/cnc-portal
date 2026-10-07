# Accounting Model — Manual Validation Script

Use this script to run concrete examples from the [use-case overview](./journal-entry-catalogue.md#use-case-overview): identify the economic
use case from the situation, open its section, match the scenario and all its participating user stories, and check the applicable rules and
entry. The `UC-<DOMAIN>-<NNN>` and `RULE-*` identifiers are proposed names, not current runtime values. Run these checks against a build
that implements the proposed model; until then, record each affected case as **Blocked**.

USD values below are illustrative. Use the same token for both sides of each example, confirm its rate of record, and record the actual
transaction hash and displayed General Ledger entry.

## Record the Review

| Field                         | Value |
| ----------------------------- | ----- |
| Company and test network      |       |
| Build or revision             |       |
| Reviewer and date             |       |
| Accounting period             |       |
| Scenario results and blockers |       |
| Transaction hashes            |       |

Mark each check **Pass**, **Fail**, **Blocked**, or **Not run**. Include the operation hash and a short note for each result other than
**Not run**.

## Prepare the Company

- Use a disposable company with Bank, Safe, Payroll, and Expense pockets available where the relevant contract permits the operation.
- Identify every company-controlled pocket and its deployed contract generation.
- Prepare external addresses with no business-purpose metadata and a separate investment through SafeDepositRouter.
- Confirm source feeds, timestamps, and valuations are ready. Record opening balances and the token amount for each operation.
- Run the review only when Accounting reports its sources as ready. Otherwise mark the affected scenario **Blocked**.

## Treasury Scenarios

### 1. Transfer $100 from Safe to Payroll

**Input:** Execute one confirmed Safe transfer of $100 to the company's Payroll pocket. No protocol fee is charged by Safe.

**Expected use case:** `UC-TREASURY-001`, applying `RULE-INTERNAL` — internal company-pocket transfer. The event is classified by its source
and destination ownership, not by the fact that Safe sent it.

**Expected General Ledger entry:**

| Account        | Debit (USD) | Credit (USD) |
| -------------- | ----------: | -----------: |
| Cash — Payroll |         100 |              |
| Cash — Safe    |             |          100 |

- [ ] The entry debits Cash — Payroll and credits the exact Safe deployment account.
- [ ] The entry balances, appears once, and changes neither income nor expenses.
- [ ] No Safe protocol-fee line appears.

Repeat with a confirmed
$100 Bank-to-Payroll transfer. It uses the same `UC-TREASURY-001` meaning, with Bank replacing Safe as the source
account. If the Bank charges a confirmed $1
fee, the expected entry is:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Cash — Payroll          |         100 |              |
| Transaction Fee Expense |           1 |              |
| Cash — Bank             |             |          101 |

- [ ] The transfer and fee remain one balanced journal entry.
- [ ] `RULE-FEE` appears only when the fee is independently confirmed for the operation.

### 2. Receive $250 with No Business Purpose

**Input:** Send $250 from an external address to Bank or Safe without providing evidence that the amount is revenue, capital, or repayment.

**Expected use case:** `UC-TREASURY-002`, applying `RULE-EXTERNAL` in — external receipt awaiting classification. The sender address alone
does not identify the economic purpose.

**Expected General Ledger entry for a Bank receipt:**

| Account               | Debit (USD) | Credit (USD) |
| --------------------- | ----------: | -----------: |
| Cash — Bank           |         250 |              |
| Unclassified Receipts |             |          250 |

- [ ] The receipt does not become Service Revenue or Owner Capital based only on the sender address.
- [ ] The receiving deployment account is preserved, and the entry balances.
- [ ] If a confirmed SafeDepositRouter investment is made instead, it uses `UC-EQUITY-001` with `RULE-EXTERNAL` in and posts Dr Cash — Safe
      $100 / Cr Investor
      Equity $100.
- [ ] The router investment produces no second receipt entry from its matching Safe transfer or SHER mint.

### 3. Pay $80 to an External Address

**Input:** Pay $80 from Safe to an external address without source evidence that establishes the business purpose.

**Expected use case:** `UC-TREASURY-003`, applying `RULE-EXTERNAL` out — external payment awaiting classification.

**Expected General Ledger entry before classification:**

| Account               | Debit (USD) | Credit (USD) |
| --------------------- | ----------: | -----------: |
| Unclassified Payments |          80 |              |
| Cash — Safe           |             |           80 |

If the operation's business evidence later establishes an operating expense, `UC-EXPENSE-001` applies `RULE-EXTERNAL` out to the same cash
movement:

| Account           | Debit (USD) | Credit (USD) |
| ----------------- | ----------: | -----------: |
| Operating Expense |          80 |              |
| Cash — Safe       |             |           80 |

- [ ] The recipient address alone does not classify the payment as an expense.
- [ ] Classification changes the counter-account without duplicating the cash movement.
- [ ] No Safe protocol-fee line appears.

For an $80 Bank payment classified as an operating expense with a confirmed $2 fee, the expected complete entry is:

| Account                 | Debit (USD) | Credit (USD) |
| ----------------------- | ----------: | -----------: |
| Operating Expense       |          80 |              |
| Transaction Fee Expense |           2 |              |
| Cash — Bank             |             |           82 |

- [ ] The matched fee is part of the payment's balanced entry; it is not a standalone transaction.
- [ ] An unmatched fee is reported as incomplete evidence and is not shown as a completed fee posting.

## Story, Use-Case, and Rule Cardinality

### 4. One Story, Several Conditional Outcomes

From the Bank transfer journey, perform the three operations below. Each operation should resolve from its own evidence:

| Operation                      | Condition                          | Expected result                                                                            |
| ------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Transfer $100 to Payroll       | Destination is company-controlled  | `UC-TREASURY-001` + `RULE-INTERNAL`; Dr Cash — Payroll $100 / Cr Cash — Bank $100          |
| Pay $80 to an external address | Evidence identifies an expense     | `UC-EXPENSE-001` + `RULE-EXTERNAL` out; Dr Operating Expense $80 / Cr Cash — Bank $80      |
| Pay $80 to an external address | No evidence identifies the purpose | `UC-TREASURY-003` + `RULE-EXTERNAL` out; Dr Unclassified Payments $80 / Cr Cash — Bank $80 |

- [ ] The destination and business-purpose evidence select the result; the user-story ID does not force one use case.
- [ ] Each source operation creates at most one balanced journal entry.

### 5. One Use Case and Rule, Several Stories

Compare the Safe-to-Payroll transfer in Scenario 1 with Bank funding Payroll and any supported Expense-to-company-pocket transfer.

- [ ] Each pure internal pocket movement uses `UC-TREASURY-001` and applies `RULE-INTERNAL`.
- [ ] Each entry names its actual source and destination deployment accounts while keeping the same accounting meaning.
- [ ] For each shared movement, all participating stories refer to the same transaction hash and the same complete journal entry.
- [ ] The UC scenario row lists the initiating and receiving stories together; each canonical story links to the shared scenario and the
      other participating story.

## Domain Examples

The following examples cover events that produce accounting entries using the catalogue's proposed ID scheme. Check each use case's posting
rules, debit/credit accounts, and economic result.

### 6. Payroll — Accrue and Settle $100 of Wages

**Use cases and rules:** `UC-PAYROLL-001` applies its wage-accrual rule. `UC-PAYROLL-002` applies `RULE-EXTERNAL` out for cash and its
share-issuance rule for SHER.

For an eligible ended week with $80 of cash wages and $20 of SHER wages, the accrual is dated at the end of the work week:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| Payroll Expense            |          80 |              |
| Deferred SHER Compensation |          20 |              |
| Wage Payable               |             |           80 |
| SHERS To Be Issued         |             |           20 |

When those wages are withdrawn, expect a separate settlement entry. The table combines cash and SHER only when both share one source
operation; separate withdrawal transactions create separate entries:

| Account            | Debit (USD) | Credit (USD) |
| ------------------ | ----------: | -----------: |
| Wage Payable       |          80 |              |
| SHERS To Be Issued |          20 |              |
| Cash — Payroll     |             |           80 |
| Investor Equity    |             |           20 |

- [ ] The eligible week accrues once at week end; disabling an ineligible claim does not create an accrual.
- [ ] Settlement clears the payable and does not expense the wages a second time.

### 7. Expense — Pay an Approved $100 Request

**Use case and rules:** `UC-EXPENSE-001` applies `RULE-EXTERNAL` out. An internal destination selects `UC-TREASURY-001` with `RULE-INTERNAL`
instead.

**Input:** Approve a $100 expense request and transfer $100 from Expense to an external recipient.

| Account           | Debit (USD) | Credit (USD) |
| ----------------- | ----------: | -----------: |
| Operating Expense |         100 |              |
| Cash — Expense    |             |          100 |

- [ ] Creating or changing the approval alone creates no journal entry.
- [ ] The external payment recognizes the expense once.
- [ ] If the destination is another company pocket, use the internal transfer example instead; the movement alone does not recognize an
      operating expense.

### 8. Community Credit — Fund and Repay a $100 Loan

**Use cases and rules:** `UC-CREDIT-001` applies `RULE-EXTERNAL` in for principal. `UC-CREDIT-002` applies its interest-recognition rule,
not `RULE-FEE`. `UC-CREDIT-003` applies `RULE-EXTERNAL` out for repayment.

At funding, recognize $100 principal and $10 fixed interest owed. When these belong to the same funding operation, the combined entry is:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Cash — Bank      |         100 |              |
| Interest Expense |          10 |              |
| Loan Payable     |             |          100 |
| Interest Payable |             |           10 |

When the lender is repaid $100 principal and $10 recognized interest:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Loan Payable     |         100 |              |
| Interest Payable |          10 |              |
| Cash — Bank      |             |          110 |

- [ ] An unfunded or refunded round creates no funded-loan entry.
- [ ] Repayment reduces principal and recognized interest; it does not recognize the same interest twice.

### 9. Equity — Invest and Pay a $100 Dividend

**Use cases and rules:** `UC-EQUITY-001` applies `RULE-EXTERNAL` in; `UC-EQUITY-002` applies `RULE-EXTERNAL` out. Direct SHER issuance uses
`UC-EQUITY-003` and its share-issuance rule.

For a confirmed router investment valued at $100:

| Account         | Debit (USD) | Credit (USD) |
| --------------- | ----------: | -----------: |
| Cash — Safe     |         100 |              |
| Investor Equity |             |          100 |

For a $100 dividend distribution:

| Account          | Debit (USD) | Credit (USD) |
| ---------------- | ----------: | -----------: |
| Dividend Expense |         100 |              |
| Cash — Bank      |             |          100 |

- [ ] A direct SHER issuance remains distinct from an investment-backed mint and is not counted a second time as new capital.
- [ ] Shareholder payments from one distribution operation are grouped and counted once.

### 10. Vesting — Stop a Schedule with $40 Released and $60 Forfeited

**Use cases and rules:** `UC-VESTING-002` and `UC-VESTING-003` apply their release and cancellation rules. They share the stop operation's
entry, with the corresponding debit and credit accounts.

The stop operation releases accrued shares worth $40 and cancels the unvested remainder worth $60. Both posting groups belong to one
balanced entry:

| Account                    | Debit (USD) | Credit (USD) |
| -------------------------- | ----------: | -----------: |
| SHERS To Be Issued         |         100 |              |
| Investor Equity            |             |           40 |
| Deferred SHER Compensation |             |           60 |

- [ ] The release and forfeiture amounts remain separately traceable within the operation.
- [ ] A stop with only one non-zero outcome posts only that outcome; a stop with neither creates no cancellation or release lines.
- [ ] Matching Investor mint evidence does not create a duplicate share issuance.

## Direct Movement Coverage

These are target scenarios for [US-ACCT-007–010](README.md#us-acct-007-review-direct-treasury-movements) and the
[contract/domain inventory](direct-movement-policy.md#contract-and-domain-coverage). Record them as **Blocked** until implemented. Use a
representative real chain operation and reload the resulting domain history, ledger, and reports; a mocked feed is not source-to-book proof.

| Scenario                                                                                                                | Required observable result                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| External native receipt at Bank, Safe, Payroll, Expense, Investor, or Campaign where accepted                           | One detected movement, correct deployment and quantity, no assumed Bank source or domain allocation; unknown purpose selects UC-TREASURY-002.         |
| Plain ERC-20 receipt at each inventory destination, including Credit, Router, Vesting and a company governance contract | Same movement in domain/contract history and Accounting; unallocated/restricted holdings remain distinct from available funds and domain obligations. |
| Native send rejected by a nonpayable destination                                                                        | No receipt or journal entry is created for the failed attempt.                                                                                        |
| Native balance change without a business event                                                                          | Use sufficient chain evidence when available; otherwise show incomplete coverage and a quantity difference without inventing a transfer.              |
| Supported-token removal followed by history refresh                                                                     | Historical movements and balances remain attributable; current spending eligibility remains separate.                                                 |
| Unknown ERC-20, own-company SHER, NFT, or missing price                                                                 | Preserve discovered identity/quantity and the applicable exclusion or missing valuation; do not invent cash value or completeness.                    |
| Two direct transfers of the same token in one transaction                                                               | Keep two movement identities and independent receipt classification; repeating sync creates neither a duplicate nor a dropped movement.               |
| A business event and its raw transfer describe one movement                                                             | Retain one posting under the specific economic UC; preserve all evidence links.                                                                       |
| Router receives tokens directly, then owner recovers them to Safe                                                       | No SHER is minted by the direct receipt; recovery is UC-TREASURY-001, retains receipt traceability, and creates no second external receipt.           |
| Direct Credit, Investor, Campaign, or Vesting receipt                                                                   | No loan subscription, shares, dividend distribution, campaign budget, or vesting entitlement is fabricated from the receipt.                          |
| Receipt at shared FeeCollector or infrastructure                                                                        | No company custody is inferred; only a confirmed company fee is attached to its parent operation.                                                     |
| Previous generation receives funds after replacement                                                                    | Correct historical deployment identity; same transaction evidence after refresh, without reassignment to the current contract.                        |
| Owner reviews a receipt, selects an eligible default, or changes one classification                                     | Permissions, account allowlist, pending/automatic modes, audit fields, original valuation and cash leg are preserved.                                 |
| Member or invalid-account classification attempt                                                                        | Reject without changing the policy or journal.                                                                                                        |
| Enable new policy with existing Service Revenue entries                                                                 | Preserve earlier classifications; explicit owner reclassification retains the previous account and reason.                                            |
| Off-platform deposit, failed refresh, and retry                                                                         | Discover at next requested sync; retain the last complete snapshot on failure, expose freshness, and converge once without duplicates.                |
| Same-block quantity reconciliation                                                                                      | Compare each deployment and asset; identify bounded divergence, restricted holdings, and missing evidence; create no automatic balancing entry.       |
| Chain revision invalidates a classified receipt                                                                         | Invalidate dependent classification and completeness, retain audit history, and verify replacement evidence before final reporting.                   |
| Plain Bank receipt without facture evidence                                                                             | Bank and Accounting retain the movement; Payment Gate creates no invoice association.                                                                 |

For each shared scenario, inspect every participating story from the UC table. Record the same source operation and movement identifiers,
complete journal entry, original asset quantity, verified block, and classification state across their views. Ordinary business operations
with missing canonical posting rules remain separate gaps rather than being forced into these fallback cases.

## Reconcile the Reports

- [ ] Each example's debits equal its credits, and each source operation appears once in the General Ledger.
- [ ] The internal movement itself does not affect the Income Statement; any independently confirmed transaction fee remains an expense.
- [ ] Trial Balance debits equal credits for the reviewed period.
- [ ] Income Statement and Balance Sheet derive from the same journal and period.
- [ ] Unclassified receipts and payments retain their suspense counterpart until a classification flow changes it; classification does not
      create another cash movement.
- [ ] The General Ledger, statements, account drill-downs, and exports agree on entries and totals.
- [ ] Reload Accounting and confirm the reviewed entries and totals remain stable.
- [ ] Reports remain non-final while an applicable source is loading, partial, failed, missing a timestamp, or missing a required valuation.

This script checks the proposed accounting behaviour and report consistency. It does not assess compliance with a particular accounting
framework or replace professional review of the chart of accounts.
