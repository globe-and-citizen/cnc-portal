import { describe, it, expect } from 'vitest'
import { buildLedger, dedupeInternalTransfers } from '@/utils/accounting/buildLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { catalogueLedger } from './catalogueLedger'

describe('buildLedger — summary on the catalogue worked example', () => {
  const { summary, entries } = buildLedger(catalogueLedger)

  it('rolls up the period totals (cash / income / expense / equity)', () => {
    expect(summary.cash).toBeCloseTo(142.2, 2)
    expect(summary.income).toBeCloseTo(115, 2)
    expect(summary.expense).toBeCloseTo(110.8, 2)
    expect(summary.equity).toBeCloseTo(138, 2)
  })

  it('counts only monetary postings (memo-only Default-D excluded)', () => {
    // 25 entries in the fixture, one of which is the memo-only direct mint.
    expect(entries).toHaveLength(25)
    expect(summary.entryCount).toBe(24)
  })

  it('returns entries sorted chronologically', () => {
    const times = entries.map((e) => e.timestamp)
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })
})

describe('buildLedger — rolls up transaction fees as a dedicated metric', () => {
  const fee: LedgerEntry = {
    id: 'fee-1',
    timestamp: 100,
    useCase: 'FEE',
    debit: 'Transaction Fee Expense',
    credit: 'Cash — Bank',
    amountUsd: 0.5,
    token: 'usdc',
    rawAmount: '500000',
    memo: 'Transaction fee skimmed from Bank',
    enrichment: 'not-applicable'
  }

  it('sums Transaction Fee Expense into `summary.transactionFees` (a subset of expense)', () => {
    const { summary } = buildLedger([fee, { ...fee, id: 'fee-2', amountUsd: 0.25 }])
    expect(summary.transactionFees).toBeCloseTo(0.75, 4)
    // The fee is also part of total expense, so the two agree here.
    expect(summary.expense).toBeCloseTo(0.75, 4)
  })
})

describe('dedupeInternalTransfers', () => {
  const base: Omit<LedgerEntry, 'id'> = {
    timestamp: 100,
    useCase: 'INTERNAL',
    debit: 'Cash — Bank',
    credit: 'Cash — Safe',
    amountUsd: 71.75,
    token: 'usdc',
    rawAmount: '71750000',
    internal: true,
    memo: 'Safe → Bank',
    enrichment: 'not-applicable'
  }

  it('collapses the two contract-side recordings of one internal transfer', () => {
    const bankSide: LedgerEntry = { ...base, id: 'bank-1' }
    const safeSide: LedgerEntry = { ...base, id: 'safe-1' }
    const result = dedupeInternalTransfers([bankSide, safeSide])
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('bank-1') // first occurrence wins
  })

  it('keeps internal moves that differ in amount or token', () => {
    const usd: LedgerEntry = { ...base, id: 'a', amountUsd: 50, rawAmount: '50000000' }
    const pol: LedgerEntry = { ...base, id: 'b', amountUsd: 1.72, rawAmount: '22', token: 'native' }
    expect(dedupeInternalTransfers([usd, pol])).toHaveLength(2)
  })

  it('never dedupes external postings (unique source events)', () => {
    const ext: LedgerEntry = { ...base, id: 'x', internal: false, useCase: 'UC-BANK-02' }
    const twin: LedgerEntry = { ...ext, id: 'y' }
    expect(dedupeInternalTransfers([ext, twin])).toHaveLength(2)
  })
})

describe('buildLedger — drops orphaned $0 postings (unpriced native legs)', () => {
  const wageSettlement: LedgerEntry = {
    id: 'withdraw-1',
    timestamp: 100,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: 'Cash — Payroll',
    amountUsd: 0, // native POL, no price-of-record → $0
    token: 'native',
    rawAmount: '1000000000000000',
    internal: false,
    memo: 'Wage withdrawal — cash settlement',
    enrichment: 'needs-off-chain-data'
  }
  const realDeposit: LedgerEntry = {
    id: 'bd1',
    timestamp: 50,
    useCase: 'UC-BANK-02',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    internal: false,
    memo: 'Client payment',
    enrichment: 'not-applicable'
  }

  it('removes a $0 posting with real accounts but no share count', () => {
    const { entries } = buildLedger([realDeposit, wageSettlement])
    expect(entries.map((e) => e.id)).toEqual(['bd1']) // the orphan $0 line is gone
  })

  it('keeps a $0 posting that still records a share count', () => {
    const shareLeg: LedgerEntry = {
      ...wageSettlement,
      id: 'shares-1',
      debit: 'Shares to be issued',
      credit: 'Investor Equity',
      token: 'sher',
      shares: 5
    }
    const { entries } = buildLedger([shareLeg])
    expect(entries.map((e) => e.id)).toEqual(['shares-1'])
  })

  it('keeps memo-only Default-D entries (no legs, real share count)', () => {
    const memoOnly: LedgerEntry = {
      id: 'mint-1',
      timestamp: 10,
      useCase: 'DEFAULT-D',
      debit: null,
      credit: null,
      amountUsd: 0,
      token: 'sher',
      rawAmount: '0',
      internal: false,
      shares: 12,
      memo: 'Direct SHER mint',
      enrichment: 'not-applicable'
    }
    const { entries } = buildLedger([memoOnly])
    expect(entries.map((e) => e.id)).toEqual(['mint-1'])
  })
})
