import { describe, it, expect } from 'vitest'
import { exportBaseName, exportFilename } from '@/utils/accounting/exportNaming'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

const FROM = new Date('2026-01-01')
const TO = new Date('2026-02-01')

describe('exportBaseName', () => {
  it('always spells out the income statement period, including "All time"', () => {
    expect(exportBaseName({ key: 'income' })).toBe('Income Statement - All time')
    expect(exportBaseName({ key: 'income', from: null, to: null })).toBe(
      'Income Statement - All time'
    )
    const ranged = exportBaseName({ key: 'income', from: FROM, to: TO })
    expect(ranged).toContain('Income Statement -')
    expect(ranged).toContain('Jan 1, 2026')
    expect(ranged).toContain('Feb 1, 2026')
  })

  it('appends the "as of" date to the balance sheet / trial balance when set', () => {
    expect(exportBaseName({ key: 'balance' })).toBe('Balance Sheet')
    expect(exportBaseName({ key: 'balance', asOf: new Date('2026-07-08') })).toBe(
      'Balance Sheet - As of Jul 8, 2026'
    )
    expect(exportBaseName({ key: 'trial', asOf: new Date('2026-07-08') })).toBe(
      'Trial Balance - As of Jul 8, 2026'
    )
  })

  it('names the ledger category, and the period only when a real range is set', () => {
    // All-category, all-time: category only, no date suffix.
    expect(exportBaseName({ key: 'ledger', filter: 'All' })).toBe('General Ledger - All')
    // A narrowed category with no date stays date-free.
    expect(exportBaseName({ key: 'ledger', filter: 'Investment' })).toBe(
      'General Ledger - Investment'
    )
    // A real range appends the period after the category.
    const scoped = exportBaseName({ key: 'ledger', filter: 'Investment', from: FROM, to: TO })
    expect(scoped).toContain('General Ledger - Investment -')
    expect(scoped).toContain('Jan 1, 2026')
  })

  it('names the account (not the category) for a single-line drill-down', () => {
    // Account drill-down (issue #2249): the account leads, with its as-of date.
    expect(exportBaseName({ key: 'ledger', account: 'Investor Equity' })).toBe(
      'General Ledger - Investor Equity'
    )
    const dated = exportBaseName({
      key: 'ledger',
      account: 'Cash — Bank',
      to: new Date('2026-07-08')
    })
    expect(dated).toContain('General Ledger - Cash — Bank - As of')
  })

  it('uses the aggregate label for a multi-account drill-down, with the period', () => {
    expect(
      exportBaseName({
        key: 'ledger',
        account: ['Payroll Expense', 'Share-based Compensation'],
        accountLabel: 'Retained earnings',
        from: FROM,
        to: TO
      })
    ).toContain('General Ledger - Retained earnings -')
  })

  it('falls back to "Aggregate" when a multi-account drill-down carries no label', () => {
    expect(
      exportBaseName({ key: 'ledger', account: ['Payroll Expense', 'Operating Expense'] })
    ).toBe('General Ledger - Aggregate')
  })

  it('names the summary export generically', () => {
    expect(exportBaseName({ key: 'summary' })).toBe('Accounting Report')
  })
})

describe('exportFilename', () => {
  it('adds the requested extension', () => {
    const spec: SectionSpec = { key: 'ledger', filter: 'Investment' }
    expect(exportFilename(spec, 'pdf')).toBe('General Ledger - Investment.pdf')
    expect(exportFilename(spec, 'xlsx')).toBe('General Ledger - Investment.xlsx')
  })

  it('strips characters no filesystem allows', () => {
    // A category carrying an illegal char is sanitised, not left to break the download.
    const spec = { key: 'ledger', filter: 'A/B:C' } as unknown as SectionSpec
    expect(exportFilename(spec, 'pdf')).toBe('General Ledger - ABC.pdf')
  })
})
