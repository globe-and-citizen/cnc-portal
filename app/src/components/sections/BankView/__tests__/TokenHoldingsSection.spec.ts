import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenHoldingsSection from '../TokenHoldingsSection.vue'
import { NETWORK } from '@/constant'

describe('TokenHoldingsSection', () => {
  const mockTokens = [
    {
      name: NETWORK.currencySymbol,
      network: NETWORK.currencySymbol,
      price: 0,
      balance: 1.5,
      amount: 1.5,
      rank: 1
    },
    {
      name: 'USDC',
      network: 'USDC',
      price: 1,
      balance: 100,
      amount: 100,
      rank: 2
    }
  ]

  it('renders token holdings table correctly', () => {
    const wrapper = mount(TokenHoldingsSection, {
      props: {
        tokensWithRank: mockTokens
      },
      global: {
        stubs: {
          TableComponent: false
        }
      }
    })

    expect(wrapper.find('h3').text()).toBe('Token Holding')
  })
})
