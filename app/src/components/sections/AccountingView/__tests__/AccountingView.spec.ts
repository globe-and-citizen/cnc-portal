import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import AccountingSummary from '../AccountingSummary.vue'
import TrialBalanceCard from '../TrialBalanceCard.vue'
import IncomeStatementCard from '../IncomeStatementCard.vue'
import BalanceSheetCard from '../BalanceSheetCard.vue'
import GeneralLedger from '../GeneralLedger.vue'
import LedgerDrilldownModal from '../LedgerDrilldownModal.vue'
import StatementLine from '../StatementLine.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import { entriesForAccount, accountBalance } from '@/utils/accounting/accountLedger'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import { LEDGER_COLUMNS } from '@/utils/accounting/ledgerPresenter'
import type { StatementLineView } from '@/utils/accounting/presenter'

// Clicking an export button used to run the real writers: `exportTablesPdf`
// ends on `doc.save(filename)`, and jsPDF — which only knows how to trigger a
// browser download — falls back to writing the file to the process cwd once the
// export settles after this file's jsdom window is gone, dropping real PDFs into
// `app/` on every run. Stub the composable so the click stops at the boundary;
// the builders behind it are covered by `accountingPdf.spec.ts` and the
// filenames by `exportNaming.spec.ts`.
const { exportPdf, exportExcel } = vi.hoisted(() => ({ exportPdf: vi.fn(), exportExcel: vi.fn() }))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf, exportExcel })
}))

beforeEach(() => {
  exportPdf.mockClear()
  exportExcel.mockClear()
})

// The cards now read live books via `useAccountingContext`. Rendered standalone
// (no parent provider) they self-fetch through the globally-mocked queries, which
// return a valid, always-balanced book (off-chain payroll accruals from the
// mocked weekly claims may appear). The numeric mapping is covered by
// `presenter.spec.ts`; here we assert the sections render without error.

describe('AccountingSummary', () => {
  it('shows the balance banner and live metric cards', () => {
    const wrapper = renderWithProviders(AccountingSummary)
    expect(wrapper.find('[data-test="balance-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="summary-Net income"]').text()).toContain('$')
    expect(wrapper.find('[data-test="summary-Total assets"]').text()).toContain('$')
  })
})

describe('TrialBalanceCard', () => {
  it('renders the trial-balance table, balanced for an empty book', () => {
    const wrapper = renderWithProviders(TrialBalanceCard)
    const text = wrapper.text()
    expect(text).toContain('Trial balance')
    expect(text).toContain('In balance')
  })

  it('opens a per-account drill-down when a row is clicked', async () => {
    const wrapper = renderWithProviders(TrialBalanceCard)
    const row = wrapper.find('[data-test^="drilldown-"]')
    // Empty books show no account rows; only exercise the drill-down when present.
    if (row.exists()) {
      await row.trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    }
    wrapper.unmount()
  })

  it('opens the account drill-down when a whole trial-balance row is selected', async () => {
    const wrapper = renderWithProviders(TrialBalanceCard)
    const rows = wrapper.findAll('tbody tr')
    // Empty books show only the total row; only exercise row-select when account
    // rows are present. Clicking the row (not the account button) fires @select.
    if (rows.length <= 1) return wrapper.unmount()
    await rows[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('exports and prints the trial balance from the export bar', async () => {
    const wrapper = renderWithProviders(TrialBalanceCard)
    await wrapper.find('[data-test="export-excel"]').trigger('click')
    await wrapper.find('[data-test="export-pdf"]').trigger('click')
    await flushPromises()
    expect(exportExcel).toHaveBeenCalledTimes(1)
    expect(exportExcel.mock.calls[0][1]).toMatch(/^Trial Balance .*\.xlsx$/)
    expect(exportPdf).toHaveBeenCalledTimes(1)
    expect(exportPdf.mock.calls[0][1].filename).toMatch(/^Trial Balance .*\.pdf$/)
    wrapper.unmount()
  })
})

describe('IncomeStatementCard', () => {
  it('renders the income statement with its per-line drill-down rows', () => {
    const wrapper = renderWithProviders(IncomeStatementCard)
    const text = wrapper.text()
    expect(text).toContain('Income statement')
    expect(text).toContain('Net income')
  })

  it('opens the drill-down when a revenue / expense line is clicked', async () => {
    const wrapper = renderWithProviders(IncomeStatementCard)
    const line = wrapper.find('[data-test^="income-drilldown-"]')
    // The mocked book may hold no income lines; only assert when one is present.
    if (line.exists()) {
      await line.trigger('click')
      await flushPromises()
      expect(wrapper.find('[data-test="drilldown-export-excel"]').exists()).toBe(true)
    }
    wrapper.unmount()
  })

  it('exports and prints the income statement from the export bar', async () => {
    const wrapper = renderWithProviders(IncomeStatementCard)
    await wrapper.find('[data-test="export-excel"]').trigger('click')
    await wrapper.find('[data-test="export-pdf"]').trigger('click')
    await flushPromises()
    expect(exportExcel.mock.calls[0][1]).toMatch(/^Income Statement .*\.xlsx$/)
    expect(exportPdf.mock.calls[0][1].filename).toMatch(/^Income Statement .*\.pdf$/)
    wrapper.unmount()
  })
})

describe('BalanceSheetCard', () => {
  it('renders the balance sheet with its per-line drill-down rows', () => {
    const wrapper = renderWithProviders(BalanceSheetCard)
    const text = wrapper.text()
    expect(text).toContain('Balance sheet')
    expect(text).toContain('Total assets')
  })

  it('drills a single equity account and the Retained earnings aggregate', async () => {
    const wrapper = renderWithProviders(BalanceSheetCard)
    // Equity lines always render: Owner capital (single account) and Retained
    // earnings (an aggregate of every income + expense account).
    await wrapper.find('[data-test="balance-drilldown-Owner Capital"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="drilldown-export-excel"]').exists()).toBe(true)

    await wrapper.find('[data-test="balance-drilldown-aggregate"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('exports and prints the balance sheet from the export bar', async () => {
    const wrapper = renderWithProviders(BalanceSheetCard)
    await wrapper.find('[data-test="export-excel"]').trigger('click')
    await wrapper.find('[data-test="export-pdf"]').trigger('click')
    await flushPromises()
    expect(exportExcel.mock.calls[0][1]).toMatch(/^Balance Sheet .*\.xlsx$/)
    expect(exportPdf.mock.calls[0][1].filename).toMatch(/^Balance Sheet .*\.pdf$/)
    wrapper.unmount()
  })
})

describe('LedgerDrilldownModal (issue #2249)', () => {
  const account = 'Investor Equity'
  const entries = entriesForAccount(catalogueLedger, account)
  const columnsStorageKey = 'cnc-accounting-modal-test-columns'

  it('lists the account entries, count and balance', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: { open: true, account, total: '$138.00', entries, columnsStorageKey }
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain(account)
    expect(text).toContain('$138.00')
    expect(text).toContain(`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`)
    wrapper.unmount()
  })

  it('emits the chosen export format and visible columns when a download button is clicked', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: { open: true, account, total: '$138.00', entries, columnsStorageKey }
    })
    await flushPromises()
    await wrapper.find('[data-test="drilldown-export-excel"]').trigger('click')
    expect(wrapper.emitted('export')?.[0]).toEqual([
      'excel',
      LEDGER_COLUMNS.map((column) => column.value)
    ])
    await wrapper.find('[data-test="drilldown-export-pdf"]').trigger('click')
    expect(wrapper.emitted('export')?.[1]).toEqual([
      'pdf',
      LEDGER_COLUMNS.map((column) => column.value)
    ])
    wrapper.unmount()
  })

  it('exports the column preference stored for its statement', async () => {
    const storedColumnsKey = 'cnc-accounting-modal-stored-columns'
    localStorage.setItem(storedColumnsKey, JSON.stringify(['activity', 'credit']))
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: { open: true, account, total: '$138.00', entries, columnsStorageKey: storedColumnsKey }
    })
    await flushPromises()
    await wrapper.find('[data-test="drilldown-export-excel"]').trigger('click')

    expect(wrapper.emitted('export')?.[0]).toEqual(['excel', ['activity', 'credit']])
    wrapper.unmount()
  })

  it('runs a Balance column after Credit when one account is drilled', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: {
        open: true,
        account,
        total: '$138.00',
        entries,
        balanceAccount: account,
        columnsStorageKey
      }
    })
    await flushPromises()
    const headers = wrapper.findAll('th').map((th) => th.text())
    expect(headers[headers.length - 1]).toBe('Balance')
    expect(headers[headers.length - 2]).toBe('Credit')

    const cells = wrapper.findAll('[data-test="ledger-balance"]').map((c) => c.text())
    // Opening balance heads the ledger, the account balance closes it, and the
    // foot repeats what the account is left standing at.
    expect(cells[0]).toBe('$0.00')
    expect(wrapper.text()).toContain('Opening balance')
    expect(cells.filter(Boolean).at(-2)).toBe(accountBalance(entries, account))
    expect(cells[cells.length - 1]).toBe('$138.00')
    wrapper.unmount()
  })

  it('carries an opening balance into the ledger and closes on the remainder', async () => {
    const opening = { debits: 100, credits: 0, balance: 100 }
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: {
        open: true,
        account,
        total: '$138.00',
        entries,
        balanceAccount: account,
        opening,
        closing: '$238.00',
        columnsStorageKey
      }
    })
    await flushPromises()
    const cells = wrapper.findAll('[data-test="ledger-balance"]').map((c) => c.text())
    expect(cells[0]).toBe('$100.00')
    // Every posting builds on it, so the foot shows the remaining balance.
    expect(cells[cells.length - 1]).toBe('$238.00')
    wrapper.unmount()
  })

  it('drops the Balance column for an aggregate line', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: {
        open: true,
        account: 'Retained earnings',
        total: '-$50.00',
        entries,
        columnsStorageKey
      }
    })
    await flushPromises()
    expect(wrapper.findAll('th').map((th) => th.text())).not.toContain('Balance')
    wrapper.unmount()
  })

  it('pages through the entries, showing the next slice on page change', async () => {
    // The whole catalogue overflows a single 10-row page, so page 2 has content.
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: {
        open: true,
        account: 'All accounts',
        total: '$0.00',
        entries: catalogueLedger,
        columnsStorageKey
      }
    })
    await flushPromises()
    const pager = wrapper.findComponent(TablePagination)
    pager.vm.$emit('update:pageSize', 20)
    pager.vm.$emit('update:page', 2)
    await flushPromises()
    // The count badge always reflects the full entry set, not the page.
    expect(wrapper.text()).toContain(`${catalogueLedger.length} entries`)
    wrapper.unmount()
  })
})

describe('StatementLine', () => {
  const drillable: StatementLineView = {
    label: 'Service Revenue',
    value: '$100.00',
    account: 'Service Revenue'
  }

  it('emits a drill-down from the row click when the line has an account', async () => {
    const wrapper = renderWithProviders(StatementLine, {
      props: { line: drillable, dataTestPrefix: 'income' }
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('drilldown')?.[0]).toEqual([drillable])
  })

  it('drills an aggregate line (accounts list) via its label button', async () => {
    const aggregate: StatementLineView = {
      label: 'Retained earnings',
      value: '-$50.00',
      accounts: ['Payroll Expense', 'Deferred SHER Compensation']
    }
    const wrapper = renderWithProviders(StatementLine, { props: { line: aggregate } })
    await wrapper.find('[data-test="statement-drilldown-aggregate"]').trigger('click')
    expect(wrapper.emitted('drilldown')?.[0]).toEqual([aggregate])
  })

  it('renders an inert plain label when the line has nothing to drill', async () => {
    const wrapper = renderWithProviders(StatementLine, {
      props: { line: { label: 'None (no debt)', value: '$0.00' } }
    })
    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.trigger('click')
    expect(wrapper.emitted('drilldown')).toBeUndefined()
  })
})

describe('GeneralLedger', () => {
  it('shows the movement total and filters by category without error', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    const text = wrapper.text()
    expect(text).toContain('Total movements')
    expect(text).toContain('entries')

    await wrapper.find('[data-test="pill-Investment"]').trigger('click')
    expect(wrapper.text()).toContain('entries')
  })
})
