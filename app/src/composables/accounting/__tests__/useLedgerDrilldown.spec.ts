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
    const d = useLedgerDrilldown(entries, bounds)
    d.openFor('Investor Equity', '$999.00')

    expect(d.open.value).toBe(true)
    expect(d.selectedLine.value?.label).toBe('Investor Equity')
    const scoped = entriesForAccount(catalogueLedger, 'Investor Equity')
    expect(d.drilldownEntries.value).toEqual(scoped)
    // The reconciling total is netted from the postings, not the clicked figure.
    expect(d.selectedLine.value?.total).toBe(accountBalance(scoped, 'Investor Equity'))
  })

  it('exports the single account through the shared pipeline', () => {
    const d = useLedgerDrilldown(entries, bounds)
    d.openFor('Investor Equity', '$1.00')
    d.onExport('excel', ['activity', 'debit'])

    expect(exportExcel).toHaveBeenCalledTimes(1)
    const [specs, filename] = exportExcel.mock.calls[0]
    expect(specs[0]).toMatchObject({ key: 'ledger', account: 'Investor Equity' })
    expect(specs[0].columns).toEqual(['activity', 'debit'])
    expect(specs[0].accountLabel).toBeUndefined()
    expect(filename).toContain('Investor Equity')
  })

  it('opens an aggregate drill-down, keeping the line figure as the total', () => {
    const d = useLedgerDrilldown(entries, bounds)
    const group = ['Payroll Expense', 'Deferred SHER Compensation']
    d.openFor(group, '-$50.00', 'Retained earnings')

    expect(d.selectedLine.value?.label).toBe('Retained earnings')
    // Mixed classes can't be netted, so the line's own figure is kept.
    expect(d.selectedLine.value?.total).toBe('-$50.00')
    expect(d.drilldownEntries.value).toEqual(entriesForAccount(catalogueLedger, group))
  })

  it('exports an aggregate with its label and total', () => {
    const d = useLedgerDrilldown(entries, bounds)
    d.openFor(['Payroll Expense', 'Deferred SHER Compensation'], '-$50.00', 'Retained earnings')
    d.onExport('pdf', ['activity'])

    expect(exportPdf).toHaveBeenCalledTimes(1)
    const [specs] = exportPdf.mock.calls[0]
    expect(Array.isArray(specs[0].account)).toBe(true)
    expect(specs[0]).toMatchObject({ accountLabel: 'Retained earnings', accountTotal: '-$50.00' })
  })

  it('labels an unlabelled aggregate "Aggregate"', () => {
    const d = useLedgerDrilldown(entries, bounds)
    // A list of accounts with no explicit label falls back to the generic name.
    d.openFor(['Payroll Expense', 'Deferred SHER Compensation'], '-$50.00')
    expect(d.selectedLine.value?.label).toBe('Aggregate')
    expect(d.selectedLine.value?.total).toBe('-$50.00')
  })

  it('runs the balance column on a single account, never on an aggregate', () => {
    const d = useLedgerDrilldown(entries, bounds)
    d.openFor('Investor Equity', '$999.00')
    expect(d.balance.value.account).toBe('Investor Equity')

    d.openFor(['Payroll Expense', 'Deferred SHER Compensation'], '-$50.00', 'Retained earnings')
    // Mixed classes share no natural side, so there is no balance to run.
    expect(d.balance.value.account).toBe('')
  })

  it('carries nothing in and closes on the account balance over an open window', () => {
    const d = useLedgerDrilldown(entries, bounds)
    d.openFor('Investor Equity', '$999.00')

    expect(d.balance.value.opening).toEqual({ debits: 0, credits: 0, balance: 0 })
    expect(d.balance.value.closing).toBe(d.selectedLine.value?.total)
  })

  it('opens on what a dated window carries in, and closes on the remainder', () => {
    const account = 'Cash — Safe'
    const all = entriesForAccount(catalogueLedger, account)
    // A window starting after the first posting leaves that posting behind it.
    const from = new Date((all[1]!.timestamp + 1) * 1000)
    const d = useLedgerDrilldown(entries, () => ({ from, to: null }))
    d.openFor(account, '$1.00')

    expect(d.balance.value.opening.balance).not.toBe(0)
    // Carried in + everything the window moves is the account's whole balance.
    expect(d.balance.value.closing).toBe(accountBalance(all, account))
  })

  it('does not export until a statement line is selected', () => {
    const d = useLedgerDrilldown(entries, bounds)
    d.onExport('excel', ['activity'])

    expect(exportExcel).not.toHaveBeenCalled()
  })
})
