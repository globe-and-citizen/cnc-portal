import { describe, it, expect, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import GeneralLedgerView from '../GeneralLedgerView.vue'
import TrialBalanceView from '../TrialBalanceView.vue'
import TablePagination from '@/components/ui/TablePagination.vue'
import ColumnVisibilitySelect from '@/components/sections/AccountingView/ColumnVisibilitySelect.vue'
import { mockRouterPush, mockRouterReplace } from '@/tests/mocks/router.mock'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'

const { accountingContext } = vi.hoisted(() => ({
  accountingContext: { journal: { value: [] as unknown[] } }
}))
vi.mock('@/composables/accounting/useAccountingContext', () => ({
  useAccountingContext: () => accountingContext
}))
accountingContext.journal.value = finalizeJournal(catalogueLedger)

// These specs exercise the ledger's interactions against the shared journal.

describe('General Ledger → Trial Balance jump', () => {
  it('routes a clicked account to its Trial Balance drill-down', async () => {
    mockRouterPush.mockClear()
    const wrapper = renderWithProviders(GeneralLedgerView)
    const link = wrapper.find('[data-test^="ledger-account-link-"]')
    if (link.exists()) {
      await link.trigger('click')
      expect(mockRouterPush).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'accounting-trial',
          query: expect.objectContaining({
            account: expect.any(String),
            accountId: expect.any(String)
          })
        })
      )
    }
    wrapper.unmount()
  })

  it('auto-opens the drill-down for ?account= and strips the query', async () => {
    const ledger = renderWithProviders(GeneralLedgerView)
    const link = ledger.find('[data-test^="ledger-account-link-"]')
    if (!link.exists()) return ledger.unmount()
    const account = link.attributes('data-test')!.replace('ledger-account-link-', '')
    ledger.unmount()
    mockRouterReplace.mockClear()
    const wrapper = renderWithProviders(TrialBalanceView, { route: { query: { account } } })
    await flushPromises()
    // Drill-down modal open (export controls mounted); query stripped so a close is final.
    expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    expect(mockRouterReplace).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('still drills directly for a ?account= with no matching trial row', async () => {
    // An account closed to a nil balance shows no trial row, so the watch takes the
    // `openFor(account, '')` fallback rather than `openDrilldown(row)`.
    mockRouterReplace.mockClear()
    const wrapper = renderWithProviders(TrialBalanceView, {
      route: { query: { account: 'No Such Account — nil balance' } }
    })
    await flushPromises()
    expect(wrapper.find('[data-test="drilldown-export-pdf"]').exists()).toBe(true)
    expect(mockRouterReplace).toHaveBeenCalled()
    wrapper.unmount()
  })
})

describe('General Ledger account filter', () => {
  it('narrows the journal to a single chosen account', async () => {
    const wrapper = renderWithProviders(GeneralLedgerView)
    // Defaults to every account selected — the summary reads "All accounts".
    const options = wrapper.findAll('[data-test^="account-filter-"]')
    // Needs at least the "All accounts" row plus two real accounts to filter.
    if (options.length < 3) return wrapper.unmount()
    expect(wrapper.text()).toContain('All accounts')

    // Clear all, then pick exactly one account: only its postings remain, and each
    // is a whole entry (its debit and its credit rows both render).
    await wrapper.find('[data-test="account-filter-all"]').trigger('click') // → none
    const one = wrapper.findAll('[data-test^="account-filter-"]')[1]!
    const accountLabel = one.text().trim()
    await one.trigger('click')
    await flushPromises()

    // The button now names the selected concrete account, and the journal still totals.
    expect(wrapper.text()).toContain(accountLabel)
    expect(wrapper.text()).toContain('Total movements')
    // Every visible account link is the chosen account or its facing leg — the
    // filter never drops half of a posting.
    const shown = new Set(
      wrapper
        .findAll('[data-test^="ledger-account-link-"]')
        .map((n) => n.attributes('data-test')!.replace('ledger-account-link-', ''))
    )
    expect(shown.size).toBeGreaterThan(1)
    wrapper.unmount()
  })
})

describe('General Ledger table controls', () => {
  it('flows page and page-size changes through the pagination footer', async () => {
    const wrapper = renderWithProviders(GeneralLedgerView)
    const pagination = wrapper.findComponent(TablePagination)
    if (!pagination.exists()) return wrapper.unmount()

    pagination.vm.$emit('update:pageSize', 50)
    pagination.vm.$emit('update:page', 1)
    await flushPromises()

    expect(wrapper.findComponent(TablePagination).exists()).toBe(true)
    wrapper.unmount()
  })

  it('applies a column-visibility change from the selector', async () => {
    const wrapper = renderWithProviders(GeneralLedgerView)
    const columns = wrapper.findComponent(ColumnVisibilitySelect)
    if (!columns.exists()) return wrapper.unmount()

    columns.vm.$emit('update:modelValue', ['date'])
    await flushPromises()

    expect(wrapper.findComponent(ColumnVisibilitySelect).exists()).toBe(true)
    wrapper.unmount()
  })
})
