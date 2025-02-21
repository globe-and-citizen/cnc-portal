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

  const defaultPriceData = {
    networkCurrencyPrice: 2000,
    usdcPrice: 1,
    loading: false,
    error: null
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
        bankBalanceSection: mockBankBalanceSection,
        priceData: defaultPriceData
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
      icon: expect.any(String),
      price: '2000.00',
      balance: '3000.00', // 1.5 ETH * $2000
      amount: '1.50',
      rank: 1
    })

    // Check USDC token
    expect(tokensWithRank[1]).toEqual({
      name: 'USDC',
      network: 'USDC',
      icon: expect.any(String),
      price: '1.00',
      balance: '100.00',
      amount: '100.00',
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
        bankBalanceSection: mockBankBalanceSection,
        priceData: defaultPriceData
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const tokensWithRank = (wrapper.vm as unknown as TokenHoldingsSectionInstance).tokensWithRank
    expect(tokensWithRank).toHaveLength(2)
    expect(tokensWithRank[0].balance).toBe('0.00')
    expect(tokensWithRank[1].balance).toBe('0.00')
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
        bankBalanceSection: mockBankBalanceSection,
        priceData: defaultPriceData
      }
    })

    const html = wrapper.html()

    expect(html).toContain('$2000.00') // ETH price
    expect(html).toContain('$3000.00') // ETH balance (1.5 * 2000)
    expect(html).toContain('$1.00') // USDC price
    expect(html).toContain('$100.00') // USDC balance
    expect(html).toContain('1') // For rank
    expect(html).toContain('2') // For rank
  })
})
