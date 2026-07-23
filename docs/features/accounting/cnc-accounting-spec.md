# CNC Accounting — Spec & Scope (Phase 1)

This document defines the **scope** and **spec** for CNC accounting: treating the CNC as a
company and producing its financial statements (general ledger → income statement →
balance sheet) from data **already available** on-chain and in the portal, reusing the
Sprint 15 pipeline.

It builds on the [money-flow catalogue](./money-flow-catalogue.md), which establishes the
chart of accounts and the use-case → journal-entry mapping. This spec answers the next
question: **which concrete data sources we already have feed those entries, and what is
still missing.**

---

## 1. Scope

### In scope — the CNC's own books

We keep **one consolidated set of books for the CNC entity**: its treasury contracts plus
its equity contract (see [money-flow-catalogue §1](./money-flow-catalogue.md)). Phase 1
produces the three statements from data we **already capture today** — on-chain contract
activity and portal records — with no new data collection required to get a first end-to-end
result.

### Explicitly out of scope (deferred)

- **Polymarket / GC:Trader activity.** A CNC team effectively has a GC:Trader account, so
the CNC's *total* accounting should eventually fold in the GC:Trader (Polymarket) books.
This is **deferred** — both because of effort and because the surface for Polymarket
accounting (a GC:Trader project vs. a dedicated app) is itself undecided
([#2078](https://github.com/globe-and-citizen/cnc-portal/issues/2078)). In the worked
example the `Trading account` / `Trading Gain` / `Trading Loss` lines stand in for an
external trader at cost; the live Polymarket position feed is **not** consolidated here.
- **Governance / wiring contracts** that move no money: `BoardOfDirectors`, `Proposals`,
`Elections`, `Officer`, `Voting`, proxies/beacons. `Officer` is read-only (fee lookup).
- **Deployed-but-unused contracts.** Only contracts the CNC actually uses are catalogued.

### Reporting boundary


| Question            | Phase 1 answer                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| Entity              | The CNC protocol entity (treasury + equity contracts), one consolidated ledger.                     |
| Per-team vs. global | **Per team** — each team's contract set is its own books. Cross-team consolidation is out of scope. |
| Currency            | USD reporting currency. **POL** at its current live price (CoinGecko); **SHER** at the router multiplier — a withdrawal frozen at its own date, a pending accrual floating at the current rate; **USDC/USDT** pegged $1. See [catalogue → Currency & valuation](./money-flow-catalogue.md#currency--valuation-rate-of-record). |
| Period              | A reporting period (the worked example uses 1–28 March 2026).                                       |
| Basis               | Payroll = **accrual** (`Wage Payable` / `Shares to be issued`); everything else = **cash basis**.   |


---

## 2. Reusing the Sprint 15 pipeline

Sprint 15 ([#1862](https://github.com/globe-and-citizen/cnc-portal/issues/1862)) built a
pipeline that reconstructs accounting for a Polymarket wallet from raw feeds. The shape is
reusable; only the **feeds** and the **categorisation** change.

```
            Sprint 15 (Polymarket)                         Phase 1 (CNC)
  ─────────────────────────────────────       ─────────────────────────────────────
  feeds:                                       feeds:
    • Data API /activity                         • on-chain contract events (the 6 used
    • Data API /positions                          contracts — see §3.1)
    • Etherscan /tokentx (USDC)                    • Etherscan/Polygonscan native + ERC-20
                                                     transfers (already proxied — §3.1)
                                                   • portal DB: Wage / Claim / WeeklyClaim /
                                                     Expense / TeamContract (§3.2)
                  │                                            │
                  ▼                                            ▼
       buildLedger(input)  ──────────────►  buildLedger(input)  (same shape)
         categorize each row                  categorize each row into the CNC
         → LedgerEntry { category,            chart-of-accounts use cases (UC-BANK-*,
           amount, cashFlow, … }              UC-CASH-*, UC-EXP-*, UC-INV-*, …)
                  │                                            │
                  ▼                                            ▼
       summary + statements                  general ledger → trial balance →
       (IS / BS / trial balance)             income statement → balance sheet
```

Concretely, the existing `buildLedger` / `LedgerEntry` / `AccountingSummary` model in
`[dashboard/app/utils/accounting.ts](../../../dashboard/app/utils/accounting.ts)` and the
statement components in
`[dashboard/app/components/accounting/](../../../dashboard/app/components/accounting/)`
(`AccountingLedger`, `AccountingTrialBalance`, `AccountingIncomeStatement`,
`AccountingBalanceSheet`) are the target rendering layer. Phase 1 work is to:

1. Add **CNC feeds** (contract events + the portal DB rows) alongside the existing
  transfer proxy.
2. Replace the Polymarket `LedgerCategory` set with the CNC **use-case categories** from
  the money-flow catalogue (`UC-BANK-01…`, `UC-CASH-02/03`, `UC-EXP-01`, `UC-INV-01`,
   `UC-SDR-01`, fee/funding internal moves).
3. Map each entry to its **debit/credit accounts** per [catalogue §5](./money-flow-catalogue.md)
  and let the existing trial-balance / IS / BS components roll them up.

---

## 3. Data inventory — what we already have

Two source families feed the ledger today.

### 3.1 On-chain (events + transfers)

Every monetary interaction in [catalogue §3](./money-flow-catalogue.md) emits an event, and
every value move is also an on-chain transfer. Source of truth = the chain; the dashboard
already proxies transfer history via
`[server/api/polygonscan/transfers.get.ts](../../../dashboard/server/api/polygonscan/transfers.get.ts)`
(Etherscan API V2, native + ERC-20). Contract addresses come from
`app/src/artifacts/deployed_addresses/` and the `TeamContract` table.


| Contract                   | Key events available                                                                                   | What it tells the ledger                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Bank**                   | `Deposited`, `TokenDeposited`, `Transfer`, `TokenTransfer`, `FeePaid`, `DividendDistributionTriggered` | Deposits in, transfers out (+ fee), dividend funding, internal funding of payroll/expense |
| **FeeCollector**           | `FeePaid`, `Withdrawn`, `TokenWithdrawn`                                                               | Fees collected (internal move from Bank), fee-treasury withdrawals                        |
| **CashRemunerationEIP712** | `Deposited`, `Withdraw`, `WithdrawToken`, `OwnerTreasuryWithdraw`*                                     | Payroll funding, wage withdrawals (cash / token / SHER mint)                              |
| **ExpenseAccountEIP712**   | `Deposited`, `TokenDeposited`, `Transfer`, `TokenTransfer`, `OwnerTreasuryWithdraw`*                   | Expense-budget funding and approved payouts                                               |
| **InvestorV1**             | `Minted`, `DividendDistributed`, `DividendPaid`                                                        | SHER mints (3 paths), pro-rata dividend distribution                                      |
| **SafeDepositRouter**      | `Deposited`                                                                                            | Invest → SHER mint (cash lands in Safe)                                                   |


> The `**Minted` event** alone is ambiguous (capital raise vs. wage-in-shares vs. direct
> mint) — it must be correlated with `Deposited` (SafeDepositRouter) or `WithdrawToken`
> (CashRemuneration) to pick the right journal entry, per
> [catalogue §5.4](./money-flow-catalogue.md). A `Minted` with neither is **Default D** —
> a direct mint booked **Dr Shares to be issued · Cr Investor Equity** at the SHER rate.

### 3.2 Portal database (accrual + classification context)

The chain records *when money moved*; the portal records *what it was for* and the accrual
side payroll needs. From `[backend/prisma/schema.prisma](../../../backend/prisma/schema.prisma)`:


| Model            | Feeds                                                            | Notes                                                                                                               |
| ---------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Wage**         | rate per hour (cash / usdc / token), overtime, active-wage chain | Defines the per-member cost basis used to value claims                                                              |
| **WeeklyClaim**  | `status`, `weekStart`, signature, `signedAgainstContractAddress` | The **accrual trigger**: a signed weekly claim is the "wage earned" event (UC-CASH-02) before the on-chain withdraw |
| **Claim**        | hours/minutes worked, memo, attachments                          | Detail behind a weekly claim; supports the payroll-expense amount                                                   |
| **Expense**      | `data` (JSON), `status`, signature, `userAddress`                | The approved budget / category context behind an ExpenseAccount payout (UC-EXP-01)                                  |
| **TeamContract** | contract `address`, `type`, `teamId`                             | Resolves which on-chain addresses belong to which team's books                                                      |


> The **accrual gap** matters: a wage is *earned* when the weekly claim is signed (portal,
> UC-CASH-02) but *paid* when the employee withdraws (chain, UC-CASH-03). Booking both
> requires joining the portal `WeeklyClaim`/`Claim` rows to the on-chain `Withdraw` /
> `WithdrawToken` events.

---

## 4. Source → statement line-item mapping

Each available source maps to a journal entry (catalogue §5) and thus to a statement line.
**IS** = income statement, **BS** = balance sheet.


| Source (event / record)                                              | Use case          | Journal entry                                                                     | Statement line(s)                                |
| -------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------ |
| Bank `Deposited` / `TokenDeposited` from a founder (no shares)       | UC-BANK-01        | Dr Cash — Bank · Cr Owner Capital                                                 | BS: Cash ↑, Owner Capital ↑                      |
| Bank `Deposited` / `TokenDeposited` from a client                    | UC-BANK-02        | Dr Cash — Bank · Cr Service Revenue                                               | IS: Service Revenue; BS: Cash ↑                  |
| SafeDepositRouter `Deposited` + InvestorV1 `Minted`                  | UC-SDR-01         | Dr Cash — Safe · Cr Investor Equity                                               | BS: Cash ↑, Investor Equity ↑                    |
| Bank `Transfer` / `TokenTransfer` + `FeePaid` (fund payroll/expense) | UC-BANK-03        | Dr Cash — Payroll/Expense · Dr Cash — FeeCollector (fee) · Cr Cash — Bank         | BS: internal cash move (no IS impact)            |
| WeeklyClaim signed (portal)                                          | UC-CASH-02        | Dr Payroll Expense · Cr Wage Payable · Cr Shares to be issued                     | IS: Payroll Expense; BS: liabilities ↑           |
| CashRemuneration `Withdraw` / `WithdrawToken` (+ `Minted`)           | UC-CASH-03        | Dr Wage Payable · Cr Cash — Payroll · Dr Shares to be issued · Cr Investor Equity | BS: liability settled, Cash ↓, Investor Equity ↑ |
| ExpenseAccount `Transfer` / `TokenTransfer` (+ Expense record)       | UC-EXP-01         | Dr Operating Expense · Cr Cash — Expense                                          | IS: Operating Expense; BS: Cash ↓                |
| Bank `DividendDistributionTriggered` / InvestorV1 `DividendPaid`     | UC-INV-01         | Dr Dividend Expense · Cr Cash — Bank                                              | IS: Dividend Expense; BS: Cash ↓                 |
| InvestorV1 `Minted` alone (direct mint)                              | Default D         | Dr Shares to be issued · Cr Investor Equity (at the SHER rate, frozen at mint date) | BS: Investor Equity ↑ (unbacked mint drives Shares to be issued contra) |
| FeeCollector `FeePaid` (from Bank transfers)                         | fee internal move | Dr Cash — FeeCollector · Cr Cash — Bank                                           | BS: internal cash move (no IS impact)            |


> **Trading lines** (`Trading account`, `Trading Gain`, `Trading Loss`, UC-TRD-) are in the
> chart of accounts and the worked example, but their live feed is the deferred
> Polymarket/GC:Trader integration — see §1. In Phase 1 they are only exercised by manual /
> dogfood entries, not an automated source.

---

## 5. How fees and expenses are booked

### 5.1 Fees

A fee on a Bank transfer moves cash **from Bank to FeeCollector** — both are CNC pockets, so
it is an **internal move**, not revenue (catalogue §4). It nets out of the income statement
and balance-sheet totals; it only redistributes cash between pockets.

```
Dr Cash — FeeCollector   (fee)
   Cr Cash — Bank        (fee)
```

> If the CNC ever bills an **external** team through FeeCollector, that inflow *is* revenue
> and should be recognised as **Protocol Fee Revenue** at FeeCollector instead of an
> internal move. Phase 1 has no external billing, so all fees stay internal.

### 5.2 Expense categories

Expenses are recognised **cash basis** (when paid), Dr `Operating Expense` · Cr the funding
pocket. The goal issue calls out explicit categories so the income statement breaks expenses
down rather than lumping them into one line:


| Category                       | What it covers                          | Source today                                               | Phase                         |
| ------------------------------ | --------------------------------------- | ---------------------------------------------------------- | ----------------------------- |
| **Payroll**                    | Wages earned by members (accrual)       | `Wage` / `WeeklyClaim` / `Claim` + CashRemuneration events | Phase 1 (`Payroll Expense`)   |
| **Operating (ExpenseAccount)** | Approved member expense payouts         | `Expense` record + ExpenseAccount `Transfer`               | Phase 1 (`Operating Expense`) |
| **Ponder (infra)**             | Indexer / hosting / infrastructure cost | **not captured on-chain** — paid off-platform              | Phase 2                       |
| **Debt (interest)**            | Interest payments on borrowed funds     | **no debt/loan concept exists yet**                        | Phase 2                       |


Phase 1 books **payroll** and **operating** expenses from existing data. **Ponder (infra)**
and **debt (interest)** are named here for the chart of accounts but have no data feed yet —
they are gaps (§6). Until then they require manual journal entries if reported at all.

---

## 6. Gaps — data a complete company accounting needs (Phase 2)

What complete company accounting needs that we **don't yet capture**:


| Gap                                               | Why it matters                                                                                                         | Proposed Phase 2 capture                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Infra / Ponder cost**                           | A real expense paid off-platform (indexer, hosting) never hits a CNC contract, so it's invisible to an on-chain ledger | Manual expense entry or an off-chain bill record feeding `Operating Expense — Infra`                                                      |
| **Debt & interest**                               | No loan/borrowing concept exists; can't book a liability or interest expense                                           | A liability account + interest schedule; manual entries until modelled                                                                    |
| **Fee revenue (external billing)**                | Today all fees are internal moves; cross-team billing would be real revenue                                            | Recognise `Protocol Fee Revenue` at FeeCollector when the payer is external                                                               |
| **FX / price-of-record** *(resolved)*             | POL→USD and SHER valuation need a defined rate source                                                                  | **Done:** POL at the current live price (CoinGecko), SHER at the router multiplier (withdrawal frozen at its date, pending accrual floats). Remaining: both refresh on the query lifecycle, not auto-watched on-chain — a live-refresh (block / `MultiplierUpdated`) is still open. |
| **Cost classification of expenses**               | `Expense.data` JSON has category context but it isn't normalised into accounting categories                            | Map `Expense.data` categories → chart-of-accounts expense lines                                                                           |
| **Polymarket / GC:Trader consolidation**          | The CNC's *total* result should fold in trading P&L                                                                    | Deferred — surface (GC:Trader project vs. dedicated app) undecided ([#2078](https://github.com/globe-and-citizen/cnc-portal/issues/2078)) |
| **Period close / retained earnings roll-forward** | Multi-period reporting needs net income to close into retained earnings                                                | Define period boundaries and a close step in the pipeline                                                                                 |
| **Real-money dogfood validation**                 | Statements are validated against a worked example, not live data                                                       | Deposit + invest in ETH as a team (per goal issue) to generate real data and validate end to end                                          |


---

## 7. Deliverables checklist (this spec)

- [x] **Scope confirmed** — CNC's own books only; Polymarket / GC:Trader excluded (§1).
- [x] **Data inventory** — on-chain events + transfers and portal DB rows that feed GL/IS/BS,
  ```
  reusing the Sprint 15 pipeline (§2–§3).
  ```
- [x] **Source → statement-line mapping** — each available source mapped to a journal entry
  ```
  and statement line (§4).
  ```
- [x] **Fees & expenses booking** — fees as internal moves; expense categories incl. Ponder
  ```
  (infra), payroll, debt (interest) (§5).
  ```
- [x] **Gaps listed** — what complete company accounting needs that we don't yet capture (§6).