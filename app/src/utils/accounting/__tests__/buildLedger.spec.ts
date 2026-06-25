import { describe, it, expect } from 'vitest'
import { buildLedger, dedupeInternalTransfers } from '@/utils/accounting/buildLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { catalogueLedger } from './catalogueLedger'

describe('buildLedger — summary on the catalogue worked example', () => {
  const { summary, entries } = buildLedger(catalogueLedger)

  it('rolls up the period totals (cash / income / expense / equity / net)', () => {
    expect(summary.cash).toBeCloseTo(142.2, 2)
    expect(summary.income).toBeCloseTo(115, 2)
    expect(summary.expense).toBeCloseTo(110.8, 2)
    expect(summary.equity).toBeCloseTo(138, 2)
    expect(summary.netIncome).toBeCloseTo(4.2, 2)
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
