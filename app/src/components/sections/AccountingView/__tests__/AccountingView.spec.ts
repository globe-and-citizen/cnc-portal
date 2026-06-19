import { describe, it, expect } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import AccountingSummary from '../AccountingSummary.vue'
import TrialBalanceCard from '../TrialBalanceCard.vue'
import GeneralLedger from '../GeneralLedger.vue'

// Each section is now its own route child under Accounting, so they render
// standalone (no in-page tab bar). Verify each section in isolation.

describe('AccountingSummary', () => {
  it('shows the balance banner and metric cards', () => {
    const wrapper = renderWithProviders(AccountingSummary)
    expect(wrapper.find('[data-test="balance-banner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="summary-Net income"]').text()).toContain('$4.20')
    expect(wrapper.find('[data-test="summary-Total assets"]').text()).toContain('$142.20')
  })
})

describe('TrialBalanceCard', () => {
  it('renders a UTable with equal debit/credit totals', () => {
    const wrapper = renderWithProviders(TrialBalanceCard)
    const text = wrapper.text()
    expect(text).toContain('Trial balance')
    expect(text).toContain('Cash (USDC + POL)')
    // Total row repeats $253.00 for both debit and credit columns.
    expect(text.match(/\$253\.00/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('GeneralLedger', () => {
  it('shows the full-book movement total and filters by category', async () => {
    const wrapper = renderWithProviders(GeneralLedger)
    const text = wrapper.text()
    expect(text).toContain('Total movements')
    expect(text).toContain('$678.10')
    expect(text).toContain('18 entries')

    await wrapper.find('[data-test="pill-Investment"]').trigger('click')
    expect(wrapper.text()).toContain('4 entries')
  })
})
