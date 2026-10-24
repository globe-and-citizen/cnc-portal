import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/tests/mocks'
import SafePnlSummary from '../SafePnlSummary.vue'
import type { SafePnl } from '@/utils/accounting/safePnl'
import { usd } from '@/utils/accounting/__tests__/fixtures'

describe('Safe P&L summary', () => {
  const pnl: SafePnl = {
    positions: [],
    complete: true,
    basis: usd(200),
    market: usd(300),
    realized: -usd('3.870494'),
    unrealized: usd(100),
    total: usd('96.129506'),
    fees: usd('3.870494')
  }
  it('[AC-US-SAFE-002-11] shows net cost, swap fees and total result independently of capital', () => {
    const wrapper = renderWithProviders(SafePnlSummary, { props: { pnl } })
    expect(wrapper.find('[data-test="pnl-realized"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pnl-unrealized"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="pnl-swap-fees"]').text()).toBe('$3.87')
    expect(wrapper.find('[data-test="pnl-total"]').text()).toBe('+$96.13')
    expect(wrapper.find('[data-test="pnl-incomplete"]').exists()).toBe(false)
  })
  it('links the swap fee total to its detail when the page has one', () => {
    const wrapper = renderWithProviders(SafePnlSummary, {
      props: { pnl, feesHref: '#safe-swap-costs' }
    })
    const link = wrapper.find('[data-test="pnl-swap-fees-link"]')
    expect(link.attributes('href')).toBe('#safe-swap-costs')
    expect(link.text()).toBe('$3.87')
  })
  it('exposes missing evidence and allows the user to retry', async () => {
    const wrapper = renderWithProviders(SafePnlSummary, {
      props: { pnl: { ...pnl, complete: false, total: null } }
    })
    expect(wrapper.find('[data-test="pnl-total"]').text()).toBe('Unavailable')
    await wrapper.find('[data-test="retry-safe-pnl"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
