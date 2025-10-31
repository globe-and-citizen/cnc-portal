import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactions from '@/components/sections/SherTokenView/InvestorsTransactions.vue'
import { mockToastStore } from '@/tests/mocks/store.mock'
import { ref } from 'vue'

// Mock Apollo Query Result
const mockQueryResult = {
  result: ref({
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
  }),
  error: ref<Error | null>(null),
  loading: ref(false)
}

const mockContractAddress = ref<string | undefined>('0xcontract')
// Mock useQuery

vi.mock('@vue/apollo-composable', () => ({
  useQuery: () => mockQueryResult
}))

// Mock stores
vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => ({
    getContractAddressByType: vi.fn(() => mockContractAddress.value)
  })),
  useCurrencyStore: vi.fn(() => ({
    getTokenPrice: vi.fn(() => 1000)
  })),
  useToastStore: vi.fn(() => mockToastStore)
}))

describe('InvestorsTransactions.vue', () => {
  const createComponent = () => {
    return mount<typeof InvestorsTransactions>(InvestorsTransactions, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should mount properly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should format transactions correctly', () => {
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
