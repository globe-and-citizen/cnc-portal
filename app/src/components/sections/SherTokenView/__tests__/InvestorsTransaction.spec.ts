import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactions from '@/components/sections/SherTokenView/InvestorsTransactions.vue'
import { ref } from 'vue'
import { mockUseApolloQuery, resetComposableMocks } from '@/tests/mocks'

const mockContractAddress = ref<string | undefined>('0xcontract')

describe('InvestorsTransactions.vue', () => {
  const createComponent = () => {
    return mount<typeof InvestorsTransactions>(InvestorsTransactions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  afterEach(() => {
    resetComposableMocks()
    vi.clearAllMocks()
  })

  it('should mount properly', () => {
    mockUseApolloQuery.result.value = {
      dividendClaims: [
        {
          id: '1',
          transactionHash: '0xtxhash1',
          from: '0xfrom1',
          to: '0xto1',
          amount: '1000000000000000000',
          tokenAddress: '0xtoken1',
          blockTimestamp: '1677649200',
          transactionType: 'dividend'
        }
      ]
    }

    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should format transactions correctly', () => {
    mockUseApolloQuery.result.value = {
      dividendClaims: [
        {
          id: '1',
          transactionHash: '0xtxhash1',
          from: '0xfrom1',
          to: '0xto1',
          amount: '1000000000000000000',
          tokenAddress: '0xtoken1',
          blockTimestamp: '1677649200',
          transactionType: 'dividend'
        }
      ]
    }

    const wrapper = createComponent()
    const transactions = (wrapper.vm as unknown as { transactionData: unknown[] }).transactionData

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      txHash: '0xtxhash1',
      from: '0xfrom1',
      to: '0xto1',
      type: 'dividend'
    })
  })

  //   it.skip('should not fetch data when investor address is not available', () => {
  //     vi.mocked(useTeamStore).mockImplementationOnce(() => ({
  //       getContractAddressByType: vi.fn(() => null)
  //     }))

  //     const wrapper = createComponent()
  //     expect(wrapper.vm.transactionData).toHaveLength(0)
  //   })

  it('should calculate USD amounts correctly', () => {
    mockUseApolloQuery.result.value = {
      dividendClaims: [
        {
          id: '1',
          transactionHash: '0xtxhash1',
          from: '0xfrom1',
          to: '0xto1',
          amount: '1000000000000000000',
          tokenAddress: '0xtoken1',
          blockTimestamp: '1677649200',
          transactionType: 'dividend'
        }
      ]
    }

    const wrapper = createComponent()
    const transactions = (
      wrapper.vm as unknown as { transactionData: Array<{ amountUSD: number }> }
    ).transactionData

    expect(transactions[0]).toHaveProperty('amountUSD')
    expect(typeof transactions[0].amountUSD).toBe('number')
  })

  it.skip('should set enabled to true when bankAddress is defined', () => {
    const wrapper = createComponent()
    // Access the enabled computed property
    const enabled = (wrapper.vm as unknown as { enabled: boolean }).enabled
    expect(enabled).toBe(true)
  })

  it.skip('should set enabled to false when bankAddress is undefined', () => {
    // Mock bankAddress as undefined
    mockContractAddress.value = undefined

    const wrapper = createComponent()
    const enabled = (wrapper.vm as unknown as { enabled: boolean }).enabled
    expect(enabled).toBe(false)
  })
})
