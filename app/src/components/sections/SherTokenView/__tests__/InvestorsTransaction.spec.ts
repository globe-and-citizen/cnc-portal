import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactions from '@/components/sections/SherTokenView/InvestorsTransactions.vue'
import { ref } from 'vue'
const mockUseQuery = {
  result: ref({
    investorDividendPaids: {
      items: []
    },
    investorDividendDistributeds: {
      items: []
    }
  }),
  error: ref<Error | null>(null),
  loading: ref(false)
}

vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => ({ ...mockUseQuery }))
  }
})

describe('InvestorsTransactions.vue', () => {
  const createComponent = () => {
    return mount<typeof InvestorsTransactions>(InvestorsTransactions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  afterEach(() => {
    mockUseQuery.result.value = {
      investorDividendPaids: {
        items: []
      },
      investorDividendDistributeds: {
        items: []
      }
    }
    mockUseQuery.error.value = null
    vi.clearAllMocks()
  })

  it('should mount properly', () => {
    mockUseQuery.result.value = {
      investorDividendPaids: {
        items: [
          {
            id: '0xtxhash1-0',
            contractAddress: '0xfrom1',
            shareholder: '0xto1',
            token: '0xtoken1',
            amount: '1000000000000000000',
            timestamp: 1677649200
          }
        ]
      },
      investorDividendDistributeds: {
        items: []
      }
    }

    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should format transactions correctly', () => {
    mockUseQuery.result.value = {
      investorDividendPaids: {
        items: [
          {
            id: '0xtxhash1-0',
            contractAddress: '0xfrom1',
            shareholder: '0xto1',
            token: '0xtoken1',
            amount: '1000000000000000000',
            timestamp: 1677649200
          }
        ]
      },
      investorDividendDistributeds: {
        items: []
      }
    }

    const wrapper = createComponent()
    const transactions = (wrapper.vm as unknown as { transactionData: unknown[] }).transactionData

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      txHash: '0xtxhash1',
      from: '0xfrom1',
      to: '0xto1',
      type: 'dividendPaid'
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
    mockUseQuery.result.value = {
      investorDividendPaids: {
        items: [
          {
            id: '0xtxhash1-0',
            contractAddress: '0xfrom1',
            shareholder: '0xto1',
            token: '0xtoken1',
            amount: '1000000000000000000',
            timestamp: 1677649200
          }
        ]
      },
      investorDividendDistributeds: {
        items: []
      }
    }

    const wrapper = createComponent()
    const transactions = (
      wrapper.vm as unknown as { transactionData: Array<{ amountUSD: number }> }
    ).transactionData

    expect(transactions[0]).toHaveProperty('amountUSD')
    expect(typeof transactions[0].amountUSD).toBe('number')
  })
})
