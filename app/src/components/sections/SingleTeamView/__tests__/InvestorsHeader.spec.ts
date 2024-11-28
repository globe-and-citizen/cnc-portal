import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import InvestorsHeader from '../InvestorsHeader.vue'
import type { Team } from '@/types'
import { parseEther } from 'viem'

describe('InvestorsHeader', () => {
  const createComponent = (props?: {
    team?: Partial<Team>
    tokenSymbol?: string
    tokenSymbolLoading?: boolean
    totalSupply?: bigint
    totalSupplyLoading?: boolean
    tokenBalance?: bigint
    loadingTokenBalance?: boolean
  }) => {
    return shallowMount(InvestorsHeader, {
      props: {
        team: { id: '1', name: 'Team 1' },
        tokenSymbol: 'BTC',
        tokenSymbolLoading: false,
        totalSupply: parseEther('1000000'),
        totalSupplyLoading: false,
        tokenBalance: parseEther('100'),
        loadingTokenBalance: false,
        ...props
      }
    })
  }

  it('should render token balance and symbol if not loading', () => {
    const wrapper = createComponent({
      loadingTokenBalance: false,
      tokenSymbolLoading: false
    })

    expect(wrapper.find('h2').text()).toContain('Balance')
    expect(wrapper.find('p[data-test="token-balance"]').text()).toContain('100 BTC')
  })

  it('should render loading dots if token balance and token symbol are loading', () => {
    const wrapper = createComponent({
      loadingTokenBalance: true,
      tokenSymbolLoading: true
    })

    expect(wrapper.find('span[data-test="token-balance-loading"]').exists()).toBeTruthy()
  })

  it('should render total supply if not loading', () => {
    const wrapper = createComponent({
      totalSupplyLoading: false
    })

    expect(wrapper.find('h3').text()).toContain('Total Supply')
    expect(wrapper.find('p[data-test="total-supply"]').text()).toContain('1000000 BTC')
  })

  it('should render loading dots if total supply is loading', () => {
    const wrapper = createComponent({
      totalSupplyLoading: true,
      tokenSymbolLoading: true
    })

    expect(wrapper.find('span[data-test="total-supply-loading"]').exists()).toBeTruthy()
  })
})
