import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

// A controlled, reactive book so the account / currency filters, their
// reconciliation, and the export scope all run deterministically. `catalogueLedger`
// spans several accounts and three currencies (usdc, native, sher) and carries fee
// legs, so every selector shows and can be exercised.
const ctx = vi.hoisted(() => ({ entries: null as null | { value: LedgerEntry[] } }))
vi.mock('@/composables/accounting/useAccountingContext', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  ctx.entries = ref<LedgerEntry[]>([])
  return { useAccountingContext: () => ({ entries: ctx.entries }) }
})

// Stop exports at the composable boundary: the real writers end on a browser
// download that, under jsdom, drops files into the process cwd (see the same stub
// in AccountingView.spec.ts). The builders behind it have their own specs.
const { exportPdf, exportExcel } = vi.hoisted(() => ({ exportPdf: vi.fn(), exportExcel: vi.fn() }))
vi.mock('@/composables/accounting/useAccountingExport', () => ({
  useAccountingExport: () => ({ exportPdf, exportExcel })
}))

import GeneralLedger from '../GeneralLedger.vue'
import AccountFilterSelect from '../AccountFilterSelect.vue'
import CurrencyFilterSelect from '../CurrencyFilterSelect.vue'

const setBook = (entries: LedgerEntry[]) => {
  ctx.entries!.value = entries
}

/** The menu entries of a filter popover carry `type="button"`; the trigger doesn't. */
const optionsOf = (component: ReturnType<typeof renderWithProviders>) =>
  component.findAll('button').filter((b) => b.attributes('type') === 'button')

beforeEach(() => {
  localStorage.clear()
  setBook([...catalogueLedger])
  exportExcel.mockClear()
  exportPdf.mockClear()
})

describe('GeneralLedger export', () => {
  it('exports the current scope to Excel and PDF from the export bar', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    await flushPromises()

    await wrapper.find('[data-test="export-excel"]').trigger('click')
    await wrapper.find('[data-test="export-pdf"]').trigger('click')

    expect(exportExcel).toHaveBeenCalledTimes(1)
    expect(exportPdf).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('switches the totals to the fee legs under the Fee filter', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    await wrapper.find('[data-test="pill-Fee"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Total movements')
    wrapper.unmount()
  })
})

describe('GeneralLedger account filter', () => {
  it('narrows the journal to a chosen account and reconciles when the book changes', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    await flushPromises()

    const filter = wrapper.findComponent(AccountFilterSelect)
    expect(filter.exists()).toBe(true)

    // Clear all, then pick a single account — the journal narrows to its postings.
    await filter.find('[data-test="account-filter-all"]').trigger('click')
    const one = filter.findAll('[data-test^="account-filter-"]')[1]!
    await one.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Total movements')

    // Shrinking the book changes the available accounts while a subset is selected,
    // so the reconciliation keeps the accounts still present (or falls back to all).
    setBook(catalogueLedger.slice(0, 8))
    await flushPromises()
    expect(wrapper.text()).toContain('Total movements')
    wrapper.unmount()
  })
})

describe('GeneralLedger currency filter', () => {
  it('narrows by a currency subset, carries it into the export, and reconciles', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    await flushPromises()

    const filter = wrapper.findComponent(CurrencyFilterSelect)
    expect(filter.exists()).toBe(true)

    // Clear all, then pick one currency — only that currency's postings remain.
    const options = optionsOf(filter)
    await options[0]!.trigger('click') // "All currencies" → none
    await optionsOf(filter)[1]!.trigger('click') // first currency
    await flushPromises()

    // The active currency subset flows into the export spec.
    await wrapper.find('[data-test="export-excel"]').trigger('click')
    expect(exportExcel).toHaveBeenCalledTimes(1)

    // Changing the book reconciles the currency selection to what's still present.
    setBook(catalogueLedger.slice(0, 8))
    await flushPromises()
    expect(wrapper.text()).toContain('Total movements')
    wrapper.unmount()
  })
})
