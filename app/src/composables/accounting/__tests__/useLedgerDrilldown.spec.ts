import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import { entriesForAccount, accountBalance } from '@/utils/accounting/accountLedger'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

// The export pipeline needs the live books + toasts (app context), so stub it and
// assert the composable hands it the right SectionSpec.
const { exportPdf, exportExcel } = vi.hoisted(() => ({ exportPdf: vi.fn(), exportExcel: vi.fn() }))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf, exportExcel })
}))

describe('useLedgerDrilldown', () => {
  const entries = ref<readonly LedgerEntry[]>(catalogueLedger)
  const bounds = () => ({ from: null, to: null })

  beforeEach(() => {
    exportPdf.mockClear()
    exportExcel.mockClear()
    localStorage.clear()
  })

  it('opens a single-account drill-down and nets that account balance', () => {
    const d = useLedgerDrilldown(entries, bounds, 'cnc-test-cols-1')
    d.openFor('Investor Equity', '$999.00')

    expect(d.open.value).toBe(true)
    expect(d.account.value).toBe('Investor Equity')
    const scoped = entriesForAccount(catalogueLedger, 'Investor Equity')
    expect(d.drilldownEntries.value).toEqual(scoped)
    // The reconciling total is netted from the postings, not the clicked figure.
    expect(d.total.value).toBe(accountBalance(scoped, 'Investor Equity'))
  })

  it('exports the single account through the shared pipeline', () => {
    const d = useLedgerDrilldown(entries, bounds, 'cnc-test-cols-2')
    d.openFor('Investor Equity', '$1.00')
    d.onExport('excel')

    expect(exportExcel).toHaveBeenCalledTimes(1)
    const [specs, filename] = exportExcel.mock.calls[0]
    expect(specs[0]).toMatchObject({ key: 'ledger', account: 'Investor Equity' })
    expect(specs[0].accountLabel).toBeUndefined()
    expect(filename).toContain('Investor Equity')
  })

  it('opens an aggregate drill-down, keeping the line figure as the total', () => {
    const d = useLedgerDrilldown(entries, bounds, 'cnc-test-cols-3')
    const group = ['Payroll Expense', 'Share-based Compensation']
    d.openFor(group, '-$50.00', 'Retained earnings')

    expect(d.account.value).toBe('Retained earnings')
    // Mixed classes can't be netted, so the line's own figure is kept.
    expect(d.total.value).toBe('-$50.00')
    expect(d.drilldownEntries.value).toEqual(entriesForAccount(catalogueLedger, group))
  })

  it('exports an aggregate with its label and total', () => {
    const d = useLedgerDrilldown(entries, bounds, 'cnc-test-cols-4')
    d.openFor(['Payroll Expense', 'Share-based Compensation'], '-$50.00', 'Retained earnings')
    d.onExport('pdf')

    expect(exportPdf).toHaveBeenCalledTimes(1)
    const [specs] = exportPdf.mock.calls[0]
    expect(Array.isArray(specs[0].account)).toBe(true)
    expect(specs[0]).toMatchObject({ accountLabel: 'Retained earnings', accountTotal: '-$50.00' })
  })

  it('defaults the visible columns to the full set', () => {
    const d = useLedgerDrilldown(entries, bounds, 'cnc-test-cols-5')
    expect(d.columns.value.length).toBeGreaterThan(0)
  })
})
