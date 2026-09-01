import { describe, it, expect } from 'vitest'
import { ledgerExportTitle } from '@/utils/accounting/ledgerPresenter'

describe('ledgerExportTitle', () => {
  const from = new Date('2026-01-01T00:00:00Z')
  const to = new Date('2026-01-31T00:00:00Z')

  it('is a plain "General Ledger" for the whole book (no filter, no period)', () => {
    expect(ledgerExportTitle()).toBe('General Ledger')
    expect(ledgerExportTitle('All')).toBe('General Ledger')
  })

  it('appends the active category when narrowed from "All"', () => {
    expect(ledgerExportTitle('Payroll')).toBe('General Ledger — Payroll')
  })

  it('appends the reporting period when a date range is set', () => {
    expect(ledgerExportTitle('All', from, to)).toContain('General Ledger — ')
    expect(ledgerExportTitle(undefined, from)).toContain('From ')
    expect(ledgerExportTitle(undefined, null, to)).toContain('Until ')
  })

  it('spells out both the category and the period together', () => {
    const title = ledgerExportTitle('Expense', from, to)
    expect(title.startsWith('General Ledger — Expense — ')).toBe(true)
  })
})
