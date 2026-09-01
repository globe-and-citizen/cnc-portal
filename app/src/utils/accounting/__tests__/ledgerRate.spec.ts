import { describe, it, expect } from 'vitest'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** A minimal priced posting whose lead row carries the given rate of record. */
const entryWithRate = (rate: number): LedgerEntry => ({
  id: `r-${rate}`,
  timestamp: 100,
  useCase: 'INTERNAL',
  debit: 'Cash — Expense',
  credit: 'Cash — Bank',
  amountUsd: 10,
  token: 'usdc',
  rawAmount: '10000000',
  memo: '',
  enrichment: 'not-applicable',
  rate
})

/** The rate string shown on a posting's lead row (the only row with a movement). */
const rateOf = (rate: number): string => ledgerRows([entryWithRate(rate)])[0].rate

describe('Rate column formatting (trailing zeros trimmed)', () => {
  it('drops padding zeros so whole and short rates read cleanly', () => {
    expect(rateOf(1)).toBe('$1')
    expect(rateOf(0.2)).toBe('$0.2')
    expect(rateOf(0.01)).toBe('$0.01')
  })

  it('keeps a value with real decimals, capped at 6 dp, never truncated below', () => {
    expect(rateOf(1.4232711)).toBe('$1.423271') // 7th dp rounded, real decimals kept
    expect(rateOf(0.080001)).toBe('$0.080001')
  })
})
