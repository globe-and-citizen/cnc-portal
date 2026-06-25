/**
 * Static journal + trial-balance dataset for the Accounting view.
 *
 * Reproduced from the CNC money-flow exercise: a balanced double-entry book
 * where every transaction nets debits against credits. Presentational demo
 * data — replace with the on-chain ledger feed when available, keeping the
 * shapes below so {@link ./accountingDemo} derivations stay valid.
 */

/** Nuxt UI semantic color names used to tone badges/chips. */
export type AccountingTone = 'primary' | 'success' | 'info' | 'neutral' | 'warning' | 'error'

export type LedgerCategory =
  | 'Investment'
  | 'Revenue'
  | 'Trading'
  | 'Transfer'
  | 'Payroll'
  | 'Expense'
  | 'Dividend'
  | 'Memo'

export interface JournalLine {
  /** Account touched by this line. */
  a: string
  /** Debit amount (mutually exclusive with `cr`). */
  dr?: number
  /** Credit amount (mutually exclusive with `dr`). */
  cr?: number
  /** Memo-only line (no monetary movement). */
  memo?: boolean
}

export interface JournalEntry {
  n: number
  date: string
  label: string
  cat: LedgerCategory
  lines: JournalLine[]
}

export type TrialNature = 'Asset' | 'Equity' | 'Income' | 'Liability' | 'Expense'

export interface TrialAccount {
  account: string
  nature: TrialNature
  dr?: number
  cr?: number
}

export const entries: JournalEntry[] = [
  // prettier-ignore
  { n: 1, date: '2026-01-08', label: 'Ravi invests $100 → receives SHER', cat: 'Investment', lines: [{ a: 'Cash — Safe', dr: 100 }, { a: 'Investor Equity', cr: 100 }] },
  // prettier-ignore
  { n: 2, date: '2026-01-12', label: 'Georges invests $10 → 100 SHER', cat: 'Investment', lines: [{ a: 'Cash — Safe', dr: 10 }, { a: 'Investor Equity', cr: 10 }] },
  // prettier-ignore
  { n: 3, date: '2026-01-20', label: 'Client pays $100 for service', cat: 'Revenue', lines: [{ a: 'Cash — Bank', dr: 100 }, { a: 'Service Revenue', cr: 100 }] },
  // prettier-ignore
  { n: 4, date: '2026-02-03', label: 'Transfer $30 to trader address', cat: 'Trading', lines: [{ a: 'Trading account', dr: 30 }, { a: 'Cash — Bank', cr: 30 }] },
  // prettier-ignore
  { n: 5, date: '2026-02-10', label: 'Trader returns $30 + $15 gain', cat: 'Trading', lines: [{ a: 'Cash — Safe', dr: 45 }, { a: 'Trading account', cr: 30 }, { a: 'Trading Gain', cr: 15 }] },
  // prettier-ignore
  { n: 6, date: '2026-02-18', label: 'Transfer Safe → Bank (fund ops)', cat: 'Transfer', lines: [{ a: 'Cash — Bank', dr: 71.75 }, { a: 'Cash — Safe', cr: 71.75 }] },
  // prettier-ignore
  { n: 7, date: '2026-03-02', label: 'Ravi funds payroll $50.02', cat: 'Transfer', lines: [{ a: 'Cash — Payroll', dr: 50 }, { a: 'Cash — FeeCollector', dr: 0.02 }, { a: 'Cash — Bank', cr: 50.02 }] },
  // prettier-ignore
  { n: 8, date: '2026-03-02', label: 'Ravi funds payroll 22 POL', cat: 'Transfer', lines: [{ a: 'Cash — Payroll', dr: 1.72 }, { a: 'Cash — FeeCollector', dr: 0.01 }, { a: 'Cash — Bank', cr: 1.73 }] },
  // prettier-ignore
  { n: 9, date: '2026-03-09', label: 'Georges claims $40 + 10 POL + 10 SHER', cat: 'Payroll', lines: [{ a: 'Payroll Expense', dr: 50.8 }, { a: 'Wage Payable', cr: 40.8 }, { a: 'Investor Equity', cr: 10 }] },
  // prettier-ignore
  { n: 10, date: '2026-03-14', label: 'Georges withdraws $40 + 10 POL + 10 SHER', cat: 'Payroll', lines: [{ a: 'Wage Payable', dr: 40.8 }, { a: 'Cash — Payroll', cr: 40.8 }, { a: 'Shares to be issued', dr: 10 }, { a: 'Investor Equity', cr: 10 }] },
  // prettier-ignore
  { n: 11, date: '2026-03-20', label: 'Ravi funds expense account $50', cat: 'Transfer', lines: [{ a: 'Cash — Expense', dr: 49.8 }, { a: 'Cash — FeeCollector', dr: 0.2 }, { a: 'Cash — Bank', cr: 50 }] },
  // prettier-ignore
  { n: 12, date: '2026-04-01', label: 'Georges withdraws expense $20', cat: 'Expense', lines: [{ a: 'Operating Expense', dr: 20 }, { a: 'Cash — Expense', cr: 20 }] },
  // prettier-ignore
  { n: 13, date: '2026-04-15', label: 'Trader withdraws $30 (redeploy)', cat: 'Trading', lines: [{ a: 'Trading account', dr: 30 }, { a: 'Cash — Bank', cr: 30 }] },
  // prettier-ignore
  { n: 14, date: '2026-04-28', label: 'Trader returns $10, loses $20', cat: 'Trading', lines: [{ a: 'Cash — Bank', dr: 10 }, { a: 'Trading Loss', dr: 20 }, { a: 'Trading account', cr: 30 }] },
  // prettier-ignore
  { n: 15, date: '2026-05-06', label: 'HR invests $10 → 10 SHER', cat: 'Investment', lines: [{ a: 'Cash — Safe', dr: 10 }, { a: 'Investor Equity', cr: 10 }] },
  // prettier-ignore
  { n: 16, date: '2026-05-19', label: 'GRG invests $8 → 8 SHER', cat: 'Investment', lines: [{ a: 'Cash — Safe', dr: 8 }, { a: 'Investor Equity', cr: 8 }] },
  // prettier-ignore
  { n: 17, date: '2026-06-02', label: 'Ravi mints 30 SHER (Default D)', cat: 'Memo', lines: [{ a: '— no journal entry (memo: +30 SHER)', memo: true }] },
  // prettier-ignore
  { n: 18, date: '2026-06-10', label: 'Ravi pays dividend $20', cat: 'Dividend', lines: [{ a: 'Dividend Expense', dr: 20 }, { a: 'Cash — Bank', cr: 20 }] }
]

export const trial: TrialAccount[] = [
  { account: 'Cash (USDC + POL)', nature: 'Asset', dr: 142.2 },
  { account: 'Trading account', nature: 'Asset', dr: 0 },
  { account: 'Owner Capital', nature: 'Equity', cr: 0 },
  { account: 'Investor Equity', nature: 'Equity', cr: 138 },
  { account: 'Service Revenue', nature: 'Income', cr: 100 },
  { account: 'Trading Gain', nature: 'Income', cr: 15 },
  { account: 'Wage Payable', nature: 'Liability', cr: 0 },
  { account: 'Payroll Expense', nature: 'Expense', dr: 50.8 },
  { account: 'Operating Expense', nature: 'Expense', dr: 20 },
  { account: 'Trading Loss', nature: 'Expense', dr: 20 },
  { account: 'Dividend Expense', nature: 'Expense', dr: 20 }
]
