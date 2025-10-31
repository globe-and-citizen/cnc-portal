import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import GenericTokenHoldingsSection from '@/components/GenericTokenHoldingsSection.vue'

// Mock the composable useContractBalance
const mockBalances = [
  {
    name: 'USD Coin',
    token: { symbol: 'USDC', name: 'USD Coin' },
    amount: 10,
    values: { USD: { formatedPrice: '$1.00', formated: '$10.00' } },
    network: 'Ethereum'
  }
]

vi.mock('@/composables', () => ({
  useContractBalance: () => ({
    balances: mockBalances,
    isLoading: false
  })
}))

describe('GenericTokenHoldingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table with a USDC row and correct values', () => {
    const wrapper = mount(GenericTokenHoldingsSection, {
      props: { address: '0x123' },
      global: {
        components: {
          TableComponent: { template: '<div class="table"><slot /></div>' },
          CardComponent: { template: '<div class="card"><slot /></div>' }
        }
      }
    })

    expect(wrapper.text()).toContain('Token Holding')
    expect(wrapper.text()).toContain('USD Coin')
    expect(wrapper.text()).toContain('10')
    expect(wrapper.text()).toContain('$10.00')
  })
})
