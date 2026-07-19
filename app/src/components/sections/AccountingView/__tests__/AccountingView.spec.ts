import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { renderWithProviders } from '@/tests/mocks'
import AccountingSummary from '../AccountingSummary.vue'
import TrialBalanceCard from '../TrialBalanceCard.vue'
import GeneralLedger from '../GeneralLedger.vue'
import LedgerDrilldownModal from '../LedgerDrilldownModal.vue'
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import { catalogueLedger } from '@/utils/accounting/__tests__/catalogueLedger'

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
})

describe('LedgerDrilldownModal (issue #2249)', () => {
  const account = 'Investor Equity'
  const entries = entriesForAccount(catalogueLedger, account)

  it('lists the account entries, count and balance', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: { open: true, account, total: '$138.00', entries }
    })
    await flushPromises()
    const text = wrapper.text()
    expect(text).toContain(account)
    expect(text).toContain('$138.00')
    expect(text).toContain(`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`)
    wrapper.unmount()
  })

  it('emits the chosen export format when a download button is clicked', async () => {
    const wrapper = renderWithProviders(LedgerDrilldownModal, {
      props: { open: true, account, total: '$138.00', entries }
    })
    await flushPromises()
    await wrapper.find('[data-test="drilldown-export-excel"]').trigger('click')
    expect(wrapper.emitted('export')?.[0]).toEqual(['excel'])
    wrapper.unmount()
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
