/**
 * Ledger consolidation — the entry point of the statement layer (issue #2117).
 *
 * The source mappers (issue #2113) already emit a clean feed of **balanced
 * double-entry postings**: every {@link LedgerEntry} carries one debit account,
 * one credit account and a single USD amount, and a multi-leg event is split
 * into several balanced pairs. This module takes that merged, chronologically
 * sorted feed and:
 *
 * 1. **Eliminates the internal-transfer double count.** A move between two of the
 *    team's own pockets (Safe ⇄ Bank ⇄ payroll/expense, and the fee skim
 *    Bank → FeeCollector) is indexed twice — once by the sending contract and
 *    once by the receiving one — so two identical `internal` postings describe
 *    one economic move. We collapse the twins to a single posting so no internal
 *    transfer or fee is counted twice (the fee dual-write is already deduped in
 *    the fee mapper; this is the cross-contract belt-and-suspenders).
 * 2. **Computes the summary totals** (cash on hand, income, expense, contributed
 *    equity, net income) the dashboard cards read.
 *
 * Internal moves are kept in the feed (they let the general-ledger view show the
 * funding journal, catalogue §6.2) — they are cash-to-cash, so they net to zero
 * on total cash and never touch the income statement or equity. What matters is
 * that each is recorded exactly once.
 */
import { classOf, type AccountName } from './chartOfAccounts'
import type { LedgerEntry } from './ledgerEntry'

/** The five on-chain cash pockets that roll up into total Cash. */
const CASH_ACCOUNTS: ReadonlySet<AccountName> = new Set<AccountName>([
  'Cash — Bank',
  'Cash — Safe',
  'Cash — Payroll',
  'Cash — Expense',
  'Cash — FeeCollector'
])

/** Equity accounts that hold *contributed* capital (not derived retained earnings). */
const CONTRIBUTED_EQUITY: ReadonlySet<AccountName> = new Set<AccountName>([
  'Owner Capital',
  'Investor Equity'
])

export interface AccountingSummary {
  /** Net cash across every pocket (Σ debits − Σ credits to the Cash accounts). */
  cash: number
  /** Net income-account total over the period (Service Revenue + Trading Gain …). */
  income: number
  /** Net expense-account total over the period (payroll, operating, dividend …). */
  expense: number
  /** Cumulative Bank protocol transaction fees skimmed to the FeeCollector (a subset of `expense`). */
  transactionFees: number
  /** Contributed equity (Owner Capital + Investor Equity), excluding retained earnings. */
  equity: number
  /** income − expense — the period's bottom line (becomes Retained Earnings). */
  netIncome: number
  /** Number of monetary postings counted (memo-only Default-D entries excluded). */
  entryCount: number
}

export interface BuiltLedger {
  /** Deduped, chronologically sorted postings — the canonical consolidated feed. */
  entries: LedgerEntry[]
  /** Roll-up totals for the summary cards. */
  summary: AccountingSummary
}

/** Round to cents — statement figures are USD reporting currency. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Content key for an internal posting, so the two contract-side twins collapse. */
function internalKey(entry: LedgerEntry): string {
  return [entry.debit, entry.credit, entry.rawAmount, entry.token, entry.timestamp].join('|')
}

/**
 * Drop the duplicate twin of every internal transfer / fee. Only `internal`
 * postings are deduped — external entries keep their unique source ids. The
 * first occurrence wins (mapper order makes the Bank-side row canonical).
 */
export function dedupeInternalTransfers(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const seen = new Set<string>()
  const out: LedgerEntry[] = []
  for (const entry of entries) {
    if (entry.internal) {
      const key = internalKey(entry)
      if (seen.has(key)) continue
      seen.add(key)
    }
    out.push(entry)
  }
  return out
}

/** Whether a posting moves real value (memo-only Default-D entries have no legs). */
function isMonetary(entry: LedgerEntry): boolean {
  return entry.debit !== null || entry.credit !== null
}

/**
 * A posting with real accounts but $0.00 USD and no share count. In a
 * USD-reported book it moves nothing — it only clutters the journal with a line
 * like "Wage Payable $0.00 / Cash — Payroll $0.00". These arise from **unpriced
 * native (POL/ETH)** legs: with no price-of-record yet (Phase 2 gap, see
 * {@link toUsd}) a native wage withdrawal or funding move values to $0. We drop
 * them here so the ledger shows no phantom, unlinked entries; once a native
 * price-of-record exists the same postings carry a non-zero USD amount and are
 * kept. Memo-only Default-D entries (no legs, but a real share count) are never
 * dropped — {@link isMonetary} already excludes them from the roll-up.
 */
function isZeroValuePosting(entry: LedgerEntry): boolean {
  return isMonetary(entry) && round2(entry.amountUsd) === 0 && !entry.shares
}

/** Aggregate the summary totals from the deduped feed. */
function summarize(entries: readonly LedgerEntry[]): AccountingSummary {
  let cash = 0
  let income = 0
  let expense = 0
  let transactionFees = 0
  let equity = 0
  let entryCount = 0

  for (const entry of entries) {
    if (!isMonetary(entry)) continue
    entryCount += 1
    const amount = entry.amountUsd

    if (entry.debit) {
      if (CASH_ACCOUNTS.has(entry.debit)) cash += amount
      else if (classOf(entry.debit) === 'EXPENSE') expense += amount
      else if (classOf(entry.debit) === 'INCOME') income -= amount
      else if (CONTRIBUTED_EQUITY.has(entry.debit)) equity -= amount
    }
    if (entry.credit) {
      if (CASH_ACCOUNTS.has(entry.credit)) cash -= amount
      else if (classOf(entry.credit) === 'INCOME') income += amount
      else if (classOf(entry.credit) === 'EXPENSE') expense -= amount
      else if (CONTRIBUTED_EQUITY.has(entry.credit)) equity += amount
    }

    // Transaction Fee Expense is also an EXPENSE, so it is already folded into
    // `expense` above; track it separately here for the dedicated summary metric.
    if (entry.debit === 'Transaction Fee Expense') transactionFees += amount
    if (entry.credit === 'Transaction Fee Expense') transactionFees -= amount
  }

  return {
    cash: round2(cash),
    income: round2(income),
    expense: round2(expense),
    transactionFees: round2(transactionFees),
    equity: round2(equity),
    netIncome: round2(income - expense),
    entryCount
  }
}

/**
 * Consolidate a merged, sorted {@link LedgerEntry} feed into the canonical ledger:
 * collapse internal-transfer twins and compute the summary totals. The result
 * feeds the general ledger, income statement and balance sheet.
 */
export function buildLedger(entries: readonly LedgerEntry[]): BuiltLedger {
  const deduped = dedupeInternalTransfers(entries)
    .filter((entry) => !isZeroValuePosting(entry))
    .sort((a, b) => a.timestamp - b.timestamp)
  return { entries: deduped, summary: summarize(deduped) }
}
