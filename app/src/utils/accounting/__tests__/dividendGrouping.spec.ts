import { describe, it, expect } from 'vitest'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const GEORGINIO = '0x1111111111111111111111111111111111111111'
const ETONAM = '0x2222222222222222222222222222222222222222'
const DISTRIBUTED_AT = 1_000

/** One `DividendPaid` leg — Dr Dividend Expense · Cr Cash — Bank (UC-INV-01). */
function dividend(shareholder: string, usd: number, timestamp = DISTRIBUTED_AT): LedgerEntry {
  return {
    id: `div-${shareholder}-${timestamp}`,
    timestamp,
    useCase: 'UC-INV-01',
    debit: 'Dividend Expense',
    credit: 'Cash — Bank',
    amountUsd: usd,
    token: 'usdc',
    rawAmount: String(usd * 1_000_000),
    rate: 1,
    counterparty: shareholder,
    internal: false,
    memo: 'Dividend paid to shareholder',
    enrichment: 'not-applicable'
  }
}

/** Debit/credit strings of the rows, for compact assertions. */
const drs = (rows: { dr: string }[]) => rows.map((r) => r.dr).filter(Boolean)
const crs = (rows: { cr: string }[]) => rows.map((r) => r.cr).filter(Boolean)

const georginio = dividend(GEORGINIO, 45)
const etonam = dividend(ETONAM, 5)

describe('dividend grouping — compound postings', () => {
  it('a multi-shareholder distribution: 1 head, itemized debits, one aggregated credit', () => {
    const rows = ledgerRows([georginio, etonam])
    // Two debit lines (one per shareholder) + one aggregated credit.
    expect(rows).toHaveLength(3)
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)

    // Debits itemized per shareholder, largest first, each keeping its movement.
    expect(drs(rows)).toEqual([money(45), money(5)])
    expect(rows[0].account).toBe('Dividend Expense')
    expect(rows[1].account).toBe('Dividend Expense')
    expect(rows[0].currency).not.toBe('') // itemized leg carries its currency

    // One aggregated credit out of Cash — Bank for the whole distribution.
    expect(crs(rows)).toEqual([money(50)])
    const credit = rows.find((r) => r.cr)
    expect(credit?.account).toBe('Cash — Bank')
    expect(credit?.currency).toBe('') // aggregated line has no single movement

    // Header reads "Dividend distributed" and each debit still names its shareholder.
    expect(rows[0].label).toBe('Dividend distributed')
    expect(rows[0].activity).toMatchObject({ kind: 'actor', actor: GEORGINIO })
    expect((rows[0].activity as { text: string }).text).toMatch(/received a .*45/)
    expect(rows[1].activity).toMatchObject({ kind: 'actor', actor: ETONAM })
    expect((rows[1].activity as { text: string }).text).toMatch(/received a .*5/)
  })

  it('total debited equals total credited equals the distribution total', () => {
    const rows = ledgerRows([georginio, etonam])
    const totalDr = drs(rows).length
    expect(totalDr).toBe(2)
    expect(crs(rows)).toEqual([money(50)]) // Σ debits (45 + 5) = the single credit
  })

  it('a single-shareholder distribution stays a plain 2-line posting', () => {
    const rows = ledgerRows([georginio])
    expect(rows).toHaveLength(2)
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    expect(rows[0].label).toBe('Dividend paid') // ungrouped keeps the per-leg label
    expect(drs(rows)).toEqual([money(45)])
    expect(crs(rows)).toEqual([money(45)])
  })

  it('two distributions at different times are not merged', () => {
    const later = dividend(GEORGINIO, 20, DISTRIBUTED_AT + 500)
    const rows = ledgerRows([georginio, etonam, later])
    // First distribution groups (2 debits + 1 credit); the second stands alone (2 lines).
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
  })
})
