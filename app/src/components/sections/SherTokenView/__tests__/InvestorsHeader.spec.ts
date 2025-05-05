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
        team: {
          id: '1',
          name: 'Team 1',
          teamContracts: [
            {
              type: 'InvestorsV1',
              address: '0x123',
              deployer: '0x456',
              admins: ['0x789']
            }
          ]
        },
        tokenSymbol: 'BTC',
        tokenSymbolLoading: false,
        totalSupply: parseEther('1000000'),
        totalSupplyLoading: false,
        tokenBalance: parseEther('100'),
        loadingTokenBalance: false,
        ...props
      },
      global: {
        stubs: {
          CardComponent: {
            template: '<div><slot /></div>'
          },
          AddressToolTip: {
            template: '<div>0x123</div>'
          }
        }
      }
    })
  }

  it('should render token balance and symbol if not loading', () => {
    const wrapper = createComponent({
      loadingTokenBalance: false,
      tokenSymbolLoading: false
    })
    const balanceElement = wrapper.find('[data-test="token-balance"]')
    expect(balanceElement.exists()).toBeTruthy()
    expect(balanceElement.text()).toContain('100 BTC')
  })

  it('should render loading dots if token balance and token symbol are loading', () => {
    const wrapper = createComponent({
      loadingTokenBalance: true,
      tokenSymbolLoading: true
    })

    const loadingElement = wrapper.find('[data-test="token-balance-loading"]')
    expect(loadingElement.exists()).toBeTruthy()
  })

  it('should render total supply if not loading', () => {
    const wrapper = createComponent({
      totalSupplyLoading: false,
      tokenSymbolLoading: false
    })

    const supplyElement = wrapper.find('[data-test="total-supply"]')
    expect(supplyElement.exists()).toBeTruthy()
    expect(supplyElement.text()).toContain('1000000 BTC')
  })

  it('should render loading dots if total supply is loading', () => {
    const wrapper = createComponent({
      totalSupplyLoading: true,
      tokenSymbolLoading: true
    })

    const loadingElement = wrapper.find('[data-test="total-supply-loading"]')
    expect(loadingElement.exists()).toBeTruthy()
  })

  it('should not render token balance when token symbol is loading', () => {
    const wrapper = createComponent({
      loadingTokenBalance: false,
      tokenSymbolLoading: true
    })

    const balanceElement = wrapper.find('[data-test="token-balance"]')
    expect(balanceElement.exists()).toBeFalsy()
  })

  it('should not render total supply when token symbol is loading', () => {
    const wrapper = createComponent({
      totalSupplyLoading: false,
      tokenSymbolLoading: true
    })

    const supplyElement = wrapper.find('[data-test="total-supply"]')
    expect(supplyElement.exists()).toBeFalsy()
  })
})
