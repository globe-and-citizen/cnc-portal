import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import AccountingSummary from '../AccountingSummary.vue'
import TrialBalanceCard from '../TrialBalanceCard.vue'
import GeneralLedger from '../GeneralLedger.vue'

// The cards now read live books via `useAccountingContext`. Rendered standalone
// (no parent provider) they self-fetch through the globally-mocked queries,
// which return no on-chain events — so each section renders a valid, balanced,
// empty book. The numeric mapping itself is covered by `presenter.spec.ts`.

describe('AccountingSummary', () => {
  it('shows the balance banner and live metric cards', () => {
    const wrapper = renderWithProviders(AccountingSummary)
    expect(wrapper.find('[data-test="balance-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="summary-Net income"]').text()).toContain('$0.00')
    expect(wrapper.find('[data-test="summary-Total assets"]').text()).toContain('$0.00')
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
    expect(text).toContain('0 entries')

    await wrapper.find('[data-test="pill-Investment"]').trigger('click')
    expect(wrapper.text()).toContain('0 entries')
  })
})
