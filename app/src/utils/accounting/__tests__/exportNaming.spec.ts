import { describe, it, expect } from 'vitest'
import { exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

const FROM = new Date('2026-01-01')
const TO = new Date('2026-02-01')

function filenameBase(spec: SectionSpec): string {
  return exportFilename(spec, 'pdf').replace(/\.pdf$/, '')
}

describe('exportFilename', () => {
  it('always spells out the income statement period, including "All time"', () => {
    expect(filenameBase({ key: 'income' })).toBe('Income Statement - All time')
    expect(filenameBase({ key: 'income', from: null, to: null })).toBe(
      'Income Statement - All time'
    )
    const ranged = filenameBase({ key: 'income', from: FROM, to: TO })
    expect(ranged).toContain('Income Statement -')
    expect(ranged).toContain('Jan 1, 2026')
    expect(ranged).toContain('Feb 1, 2026')
  })

  it('appends the "as of" date to the balance sheet / trial balance when set', () => {
    expect(filenameBase({ key: 'balance' })).toBe('Balance Sheet')
    expect(filenameBase({ key: 'balance', asOf: new Date('2026-07-08') })).toBe(
      'Balance Sheet - As of Jul 8, 2026'
    )
    expect(filenameBase({ key: 'trial', asOf: new Date('2026-07-08') })).toBe(
      'Trial Balance - As of Jul 8, 2026'
    )
  })

  it('names the ledger by its reporting period only', () => {
    expect(filenameBase({ key: 'ledger' })).toBe('General Ledger')
    const scoped = filenameBase({ key: 'ledger', from: FROM, to: TO })
    expect(scoped).toContain('General Ledger -')
    expect(scoped).toContain('Jan 1, 2026')
  })

  it('names the account (not the category) for a single-line drill-down', () => {
    // Account drill-down (issue #2249): the account leads, with its as-of date.
    expect(filenameBase({ key: 'ledger', account: 'Investor Equity' })).toBe(
      'General Ledger - Investor Equity'
    )
    const dated = filenameBase({
      key: 'ledger',
      account: 'Cash — Bank',
      to: new Date('2026-07-08')
    })
    expect(dated).toContain('General Ledger - Cash — Bank - As of')
  })

  it('uses the aggregate label for a multi-account drill-down, with the period', () => {
    expect(
      filenameBase({
        key: 'ledger',
        account: ['Payroll Expense', 'Deferred SHER Compensation'],
        accountLabel: 'Retained earnings',
        from: FROM,
        to: TO
      })
    ).toContain('General Ledger - Retained earnings -')
  })

  it('falls back to "Aggregate" when a multi-account drill-down carries no label', () => {
    expect(filenameBase({ key: 'ledger', account: ['Payroll Expense', 'Operating Expense'] })).toBe(
      'General Ledger - Aggregate'
    )
  })

  it('names the summary export generically', () => {
    expect(filenameBase({ key: 'summary' })).toBe('Accounting Report')
  })
})

describe('exportFilename extension and sanitization', () => {
  it('adds the requested extension', () => {
    const spec: SectionSpec = { key: 'ledger' }
    expect(exportFilename(spec, 'pdf')).toBe('General Ledger.pdf')
    expect(exportFilename(spec, 'xlsx')).toBe('General Ledger.xlsx')
  })

  it('strips characters no filesystem allows', () => {
    const spec = { key: 'ledger', account: 'A/B:C' } as const
    expect(exportFilename(spec, 'pdf')).toBe('General Ledger - ABC.pdf')
  })
})
