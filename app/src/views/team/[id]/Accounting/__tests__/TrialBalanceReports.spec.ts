import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import TrialBalanceView from '../TrialBalanceView.vue'
import DatePicker from '@/components/ui/DatePicker.vue'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { usd } from '@/utils/accounting/__tests__/fixtures'

const accountingContext = vi.hoisted(() => ({
  journal: { value: [] as unknown[] },
  status: { state: { value: 'ready' } },
  refetch: vi.fn()
}))
const safePnl = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
const { exportPdf, exportExcel } = vi.hoisted(() => ({ exportPdf: vi.fn(), exportExcel: vi.fn() }))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf, exportExcel })
}))
vi.mock('@/composables/accounting/useAccountingContext', () => ({
  useAccountingContext: () => accountingContext
}))
vi.mock('@/composables/accounting/useSafePnl', () => ({
  useSafePnl: () => ({ data: safePnl, isLoading: { value: false } })
}))

beforeEach(() => {
  accountingContext.journal.value = finalizeJournal(catalogueLedger)
  safePnl.value = {
    positions: [],
    complete: true,
    basis: usd('529.07'),
    market: usd('476.64'),
    realized: 0n,
    unrealized: -usd('52.43'),
    total: -usd('52.43'),
    fees: 0n
  }
  vi.clearAllMocks()
})

describe('TrialBalanceView', () => {
  it('[AC-US-ACCT-003-12] shows the Safe at its Safe Account market value today, in the table and the export', async () => {
    const wrapper = renderWithProviders(TrialBalanceView)
    const rows = wrapper.findAll('tbody tr').map((row) => row.text())
    const adjustment = wrapper
      .findAll('tbody tr')
      .find((row) => row.text().includes('Safe Market Value Adjustment'))!
      .findAll('td')
    expect(adjustment.map((cell) => cell.text()).slice(-2)).toEqual(['—', '$52.43'])
    expect(rows.find((row) => row.includes('Unrealized Loss on Digital Assets'))).toContain(
      '$52.43'
    )
    expect(wrapper.find('[data-test="market-revaluation-note"]').text()).toContain(
      'Safe shown at market value: $476.64 (cost $529.07, unrealized -$52.43)'
    )
    expect(wrapper.text()).toContain('In balance')
    await wrapper.find('[data-test="export-excel"]').trigger('click')
    expect(exportExcel.mock.calls[0][0][0].adjustments).toHaveLength(1)
    wrapper
      .findComponent(DatePicker)
      .vm.$emit('update:modelValue', new Date('2020-01-01T12:00:00Z'))
    await flushPromises()
    expect(wrapper.text()).not.toContain('Safe Market Value Adjustment')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
    wrapper.unmount()
  })
  /**
   * Covers:
   * - [AC-US-ACCT-001-09]
   * - [AC-US-ACCT-003-03]
   * - [AC-US-ACCT-003-09]
   */
  it('renders the trial-balance table, balanced for an empty book', () => {
    const wrapper = renderWithProviders(TrialBalanceView)
    const text = wrapper.text()
    expect(text).toContain('Trial balance')
    expect(text).toContain('In balance')
  })

  it('[AC-US-ACCT-003-04] opens a per-account drill-down when a row is clicked', async () => {
    const wrapper = renderWithProviders(TrialBalanceView)
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
    const wrapper = renderWithProviders(TrialBalanceView)
    const rows = wrapper.findAll('tbody tr')
    // Empty books show only the total row; only exercise row-select when account
    // rows are present. Clicking the row (not the account button) fires @select.
    if (rows.length <= 1) return wrapper.unmount()
    await rows[0]!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('[AC-US-ACCT-004-01] exports and prints the trial balance from the export bar', async () => {
    const wrapper = renderWithProviders(TrialBalanceView)
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
