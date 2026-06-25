/**
 * The money-flow catalogue worked example (§6) as a consolidated
 * {@link LedgerEntry} feed — the canonical fixture for the statement layer.
 *
 * It is the §6.2 general-ledger journal, with every multi-leg transaction split
 * into balanced debit/credit pairs (the shape the source mappers emit). It
 * balances at every level: journal total 678.10, trial balance 253, assets 142.20
 * = equity 142.20 — so any builder that reproduces those numbers is correct.
 *
 * Trading lines (UC-TRD) are authored by hand here: their live feed is the
 * deferred Polymarket / GC:Trader integration (spec §1), so no mapper produces
 * them, but the catalogue exercises them and the books must still balance.
 */
import type { TokenId } from '@/constant'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry, UseCase } from '@/utils/accounting/ledgerEntry'

/** Unix seconds for a given day in March 2026 (the worked-example period). */
function march(day: number): number {
  return Math.floor(Date.UTC(2026, 2, day) / 1000)
}

let seq = 0

interface PostInput {
  day: number
  useCase: UseCase
  debit: AccountName | null
  credit: AccountName | null
  usd: number
  internal?: boolean
  token?: TokenId
  memo?: string
  shares?: number
  category?: string
}

/** Build one balanced posting (or a memo-only entry when debit/credit are null). */
function post(input: PostInput): LedgerEntry {
  seq += 1
  return {
    id: `cat-${seq}`,
    timestamp: march(input.day),
    useCase: input.useCase,
    debit: input.debit,
    credit: input.credit,
    amountUsd: input.usd,
    token: input.token ?? 'usdc',
    rawAmount: String(input.usd),
    internal: input.internal ?? false,
    memo: input.memo ?? '',
    enrichment: 'not-applicable',
    ...(input.shares !== undefined ? { shares: input.shares } : {}),
    ...(input.category !== undefined ? { category: input.category } : {})
  }
}

/** The §6.2 journal, balanced pair by balanced pair (18 transactions, #17 memo). */
export const catalogueLedger: LedgerEntry[] = [
  // 1 — Ravi invests $100 & gets SHER
  post({ day: 1, useCase: 'UC-SDR-01', debit: 'Cash — Safe', credit: 'Investor Equity', usd: 100 }),
  // 2 — Geor invests $10 & gets SHER
  post({ day: 1, useCase: 'UC-SDR-01', debit: 'Cash — Safe', credit: 'Investor Equity', usd: 10 }),
  // 3 — Client pays $100 (service)
  post({
    day: 3,
    useCase: 'UC-BANK-02',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    usd: 100
  }),
  // 4 — Deploy $30 to trader
  post({ day: 4, useCase: 'CASH-OUT', debit: 'Trading account', credit: 'Cash — Bank', usd: 30 }),
  // 5 — Trader returns $30 capital + $15 profit
  post({ day: 10, useCase: 'CASH-IN', debit: 'Cash — Safe', credit: 'Trading account', usd: 30 }),
  post({ day: 10, useCase: 'CASH-IN', debit: 'Cash — Safe', credit: 'Trading Gain', usd: 15 }),
  // 6 — Transfer $71.75 Safe → Bank (fund operations) — internal
  post({
    day: 11,
    useCase: 'INTERNAL',
    debit: 'Cash — Bank',
    credit: 'Cash — Safe',
    usd: 71.75,
    internal: true
  }),
  // 7 — Ravi funds payroll $50.02 (fee $0.02) — internal
  post({
    day: 12,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    usd: 50,
    internal: true
  }),
  post({
    day: 12,
    useCase: 'FEE',
    debit: 'Cash — FeeCollector',
    credit: 'Cash — Bank',
    usd: 0.02,
    internal: true
  }),
  // 8 — Ravi funds payroll 22 POL ($1.73, fee $0.01) — internal
  post({
    day: 12,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    usd: 1.72,
    internal: true,
    token: 'native'
  }),
  post({
    day: 12,
    useCase: 'FEE',
    debit: 'Cash — FeeCollector',
    credit: 'Cash — Bank',
    usd: 0.01,
    internal: true,
    token: 'native'
  }),
  // 9 — Geor claims $40 + 10 POL + 10 SHER (accrual)
  post({
    day: 13,
    useCase: 'UC-CASH-02',
    debit: 'Payroll Expense',
    credit: 'Wage Payable',
    usd: 40.8,
    category: 'Payroll'
  }),
  post({
    day: 13,
    useCase: 'UC-CASH-02',
    debit: 'Payroll Expense',
    credit: 'Shares to be issued',
    usd: 10,
    token: 'sher',
    category: 'Payroll'
  }),
  // 10 — Geor withdraws the same (settles cash leg + mints SHER)
  post({
    day: 15,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: 'Cash — Payroll',
    usd: 40.8,
    category: 'Payroll'
  }),
  post({
    day: 15,
    useCase: 'UC-CASH-03',
    debit: 'Shares to be issued',
    credit: 'Investor Equity',
    usd: 10,
    token: 'sher',
    category: 'Payroll'
  }),
  // 11 — Ravi funds expense $50 (fee $0.20) — internal
  post({
    day: 16,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Expense',
    credit: 'Cash — Bank',
    usd: 49.8,
    internal: true
  }),
  post({
    day: 16,
    useCase: 'FEE',
    debit: 'Cash — FeeCollector',
    credit: 'Cash — Bank',
    usd: 0.2,
    internal: true
  }),
  // 12 — Geor withdraws $20 expense
  post({
    day: 17,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: 'Cash — Expense',
    usd: 20,
    category: 'Operating'
  }),
  // 13 — Redeploy $30 to trader
  post({ day: 18, useCase: 'CASH-OUT', debit: 'Trading account', credit: 'Cash — Bank', usd: 30 }),
  // 14 — Trader returns $10 & loses $20
  post({ day: 24, useCase: 'CASH-IN', debit: 'Cash — Bank', credit: 'Trading account', usd: 10 }),
  post({ day: 24, useCase: 'CASH-OUT', debit: 'Trading Loss', credit: 'Trading account', usd: 20 }),
  // 15 — HR invests $10 & gets SHER
  post({ day: 25, useCase: 'UC-SDR-01', debit: 'Cash — Safe', credit: 'Investor Equity', usd: 10 }),
  // 16 — GRG invests $8 & gets SHER
  post({ day: 25, useCase: 'UC-SDR-01', debit: 'Cash — Safe', credit: 'Investor Equity', usd: 8 }),
  // 17 — Ravi mints 30 SHER for himself (Default D) — memo only, value 0
  post({
    day: 26,
    useCase: 'DEFAULT-D',
    debit: null,
    credit: null,
    usd: 0,
    token: 'sher',
    shares: 30,
    memo: 'Direct mint +30 SHER'
  }),
  // 18 — Ravi pays $20 dividend
  post({ day: 28, useCase: 'UC-INV-01', debit: 'Dividend Expense', credit: 'Cash — Bank', usd: 20 })
]
