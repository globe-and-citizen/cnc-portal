import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import AccountingSummary from '../AccountingSummary.vue'
import TrialBalanceCard from '../TrialBalanceCard.vue'
import GeneralLedger from '../GeneralLedger.vue'

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
