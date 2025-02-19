import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenHoldingsSection from '../TokenHoldingsSection.vue'
import { NETWORK } from '@/constant'
import type { ComponentPublicInstance } from 'vue'
describe('TokenHoldingsSection', () => {
  interface Token {
    name: string
    network: string
    price: number // Price in USD
    balance: number // Balance in token's native unit
    amount: number // Amount in token's native unit
  }

  interface TokenWithRank extends Token {
    rank: number
  }
  interface TokenHoldingsSectionInstance extends ComponentPublicInstance {
    tokensWithRank: TokenWithRank[]
  }

  it('formats token holdings data correctly', async () => {
    const mockBankBalanceSection = {
      teamBalance: {
        formatted: '1.5'
      },
      formattedUsdcBalance: '100'
    }

    const wrapper = mount(TokenHoldingsSection, {
      props: {
        bankBalanceSection: mockBankBalanceSection
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const tokensWithRank = (wrapper.vm as unknown as TokenHoldingsSectionInstance).tokensWithRank
    expect(tokensWithRank).toHaveLength(2) // ETH and USDC

    // Check ETH token
    expect(tokensWithRank[0]).toEqual({
      name: NETWORK.currencySymbol,
      network: NETWORK.currencySymbol,
      price: 0,
      balance: 1.5,
      amount: 1.5,
      rank: 1
    })

    // Check USDC token
    expect(tokensWithRank[1]).toEqual({
      name: 'USDC',
      network: 'USDC',
      price: 1,
      balance: 100,
      amount: 100,
      rank: 2
    })
  })

  it('handles undefined balance values', () => {
    const mockBankBalanceSection = {
      teamBalance: undefined,
      formattedUsdcBalance: undefined
    }

    const wrapper = mount(TokenHoldingsSection, {
      props: {
        bankBalanceSection: mockBankBalanceSection
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const tokensWithRank = (wrapper.vm as unknown as TokenHoldingsSectionInstance).tokensWithRank
    expect(tokensWithRank).toHaveLength(2)
    expect(tokensWithRank[0].balance).toBe(0)
    expect(tokensWithRank[1].balance).toBe(0)
  })

  it('renders formatted data in table correctly', () => {
    const mockBankBalanceSection = {
      teamBalance: {
        formatted: '1.5'
      },
      formattedUsdcBalance: '100'
    }

    const wrapper = mount(TokenHoldingsSection, {
      props: {
        bankBalanceSection: mockBankBalanceSection
      }
    })

    const html = wrapper.html()

    expect(html).toContain('$1.5') // For balance
    expect(html).toContain('$100') // For USDC price/balance
    expect(html).toContain('1') // For rank
    expect(html).toContain('2') // For rank
  })
})
