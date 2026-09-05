import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useLedgerDrilldown } from '@/composables/accounting/useLedgerDrilldown'
import { accountNet, entriesForAccount } from '@/utils/accounting/accountLedger'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { money } from '@/utils/accounting/presenter'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'

const { exportPdf, exportExcel } = vi.hoisted(() => ({ exportPdf: vi.fn(), exportExcel: vi.fn() }))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf, exportExcel })
}))

const journal = buildJournal(catalogueLedger)

describe('useLedgerDrilldown', () => {
  const entries = ref(journal)
  const bounds = () => ({ from: null, to: null })

  beforeEach(() => {
    exportPdf.mockClear()
    exportExcel.mockClear()
    localStorage.clear()
  })

  it('opens a family drill-down from its complete JournalEntry records', () => {
    const drilldown = useLedgerDrilldown(entries, bounds)
    drilldown.openFor('Investor Equity', '$999.00')

    const scoped = entriesForAccount(journal, 'Investor Equity')
    expect(drilldown.open.value).toBe(true)
    expect(drilldown.drilldownEntries.value).toEqual(scoped)
    expect(drilldown.selectedLine.value).toMatchObject({
      label: 'Investor Equity',
      total: money(accountNet(scoped, 'Investor Equity'))
    })
  })

  it('exports the same journal account selection and statement total', () => {
    const drilldown = useLedgerDrilldown(entries, bounds)
    drilldown.openFor('Investor Equity', '$1.00')
    drilldown.onExport('excel', ['activity', 'dr'])

    const [specs, filename] = exportExcel.mock.calls[0]
    expect(specs[0]).toMatchObject({
      key: 'ledger',
      journalAccountLabel: 'Investor Equity',
      journalAccountTotal: drilldown.selectedLine.value?.total
    })
    expect(specs[0].journalAccounts.length).toBeGreaterThan(0)
    expect(specs[0].columns).toEqual(['activity', 'dr'])
    expect(filename).toContain('Investor Equity')
  })

  it('keeps an aggregate statement figure and selects the union of its journal entries', () => {
    const drilldown = useLedgerDrilldown(entries, bounds)
    const accounts = ['Payroll Expense', 'Deferred SHER Compensation'] as const
    drilldown.openFor(accounts, '-$50.00', 'Retained earnings')

    expect(drilldown.selectedLine.value).toMatchObject({
      label: 'Retained earnings',
      total: '-$50.00'
    })
    expect(drilldown.drilldownEntries.value).toEqual(entriesForAccount(journal, accounts))
    expect(drilldown.balance.value.account).toBeNull()
  })

  it('uses the concrete Account of a Trial Balance row for a running balance', () => {
    const account = journal[0]!.lines[0]!.account
    const drilldown = useLedgerDrilldown(entries, bounds)
    drilldown.openFor(account, '$0.00', account.family.name)

    expect(drilldown.balance.value.account).toEqual(account)
    expect(drilldown.balance.value.closing).toBe(drilldown.selectedLine.value?.total)
  })

  it('carries a dated opening balance from prior journal entries', () => {
    const account = journal
      .find((entry) => entry.lines.some((line) => line.account.family.name === 'Cash — Safe'))!
      .lines.find((line) => line.account.family.name === 'Cash — Safe')!.account
    const all = entriesForAccount(journal, account)
    const from = new Date((all[1]!.timestamp + 1) * 1000)
    const drilldown = useLedgerDrilldown(entries, () => ({ from, to: null }))
    drilldown.openFor(account, '$0.00', 'Cash — Safe')

    expect(drilldown.balance.value.opening.balance).not.toBe(0)
    expect(drilldown.balance.value.closing).toBe(money(accountNet(all, account)))
  })

  it('does not export before a statement line is selected', () => {
    const drilldown = useLedgerDrilldown(entries, bounds)
    drilldown.onExport('excel', ['activity'])
    expect(exportExcel).not.toHaveBeenCalled()
  })
})
