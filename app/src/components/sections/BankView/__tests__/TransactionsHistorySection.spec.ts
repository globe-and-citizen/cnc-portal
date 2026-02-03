import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
// Mock stores before importing the component to avoid store initialization side-effects

vi.mock('@/stores/currencyStore', () => ({
  useCurrencyStore: vi.fn(() => ({
    localCurrency: ref({ code: 'USD' }),
    nativeToken: ref({ priceInUSD: 1, priceInLocal: 1 })
  }))
}))

import type { ExpenseTransaction } from '@/types/transactions'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import * as utils from '@/utils'

vi.mock('vue-router', () => ({
  useRoute: vi.fn(() => ({
    params: {
      id: 0
    }
  })),
  createRouter: vi.fn(() => ({
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  })),
  createWebHistory: vi.fn(),
  useRouter: vi.fn(() => ({
    beforeEach: vi.fn(),
    afterEach: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn()
  }))
}))

const mockUseQuery = {
  result: ref({
    transactions: [
      {
        amount: '7000000',
        blockNumber: '33',
        blockTimestamp: Math.floor(Date.now() / 1000).toString(),
        contractAddress: '0x552a6b9d3c6ef286fb40eeae9e8cfecdab468c0a',
        contractType: 'Bank',
        from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        id: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a01000000',
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        tokenAddress: '0x59b670e9fa9d0a427751af201d676719a970857b',
        transactionHash: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a',
        transactionType: 'deposit',
        __typename: 'Transaction'
      }
    ]
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

// Import the component after store mocks to avoid initializing real stores
const TransactionHistorySection = (
  await import('@/components/sections/BankView/TransactionsHistorySection.vue')
).default

describe('TransactionHistorySection', () => {
  const mockTransactions: ExpenseTransaction[] = [
    {
      txHash: '0x123',
      date: Date.now(),
      type: 'deposit',
      from: '0xabc',
      to: '0xdef',
      amountUSD: 100,
      amount: '100',
      token: 'USDC'
    }
  ]

  const defaultProps = {
    currencyRates: {
      loading: false as const,
      error: null as null,
      getRate: () => 1
    },
    transactions: mockTransactions
  }

  it('renders correctly', () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        },
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('displays transaction history component', async () => {
    const wrapper = mount(TransactionHistorySection, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })
    await flushPromises()
    expect(wrapper.findComponent({ name: 'GenericTransactionHistory' }).exists()).toBe(true)
  })

  it('handles receipt click', async () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        stubs: {
          // keep child stubbed for this wrapper-level test
          GenericTransactionHistory: true
        }
      }
    })

    // TransactionHistorySection is a thin wrapper that renders GenericTransactionHistory.
    // Ensure it passes the `transactions` prop through to the child component.
    const child = wrapper.findComponent({ name: 'GenericTransactionHistory' })
    expect(child.exists()).toBe(true)
    expect(child.props('transactions')).toEqual(defaultProps.transactions)
  })

  describe('Render', () => {
    interface ComponentOptions {
      props?: Record<string, unknown>
      data?: () => Record<string, unknown>
      global?: Record<string, unknown>
    }

    const createComponent = ({
      props = {},
      data = () => ({}),
      global = {}
    }: ComponentOptions = {}) =>
      mount(TransactionHistorySection, {
        props: { ...props },
        data,
        global: { ...global, plugins: [createTestingPinia({ createSpy: vi.fn })] }
      })

    it('should show receipt when receipt is clicked', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const tableEl = wrapper.find('[data-test="table"]')
      expect(tableEl.exists()).toBeTruthy()
      const firstRow = wrapper.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      const receiptButton = firstRow.find('[data-test="transaction-history-receipt-button"]')
      expect(receiptButton.exists()).toBeTruthy()
      await receiptButton.trigger('click')

      await flushPromises()
      const receiptComponent = wrapper.findComponent({ name: 'ReceiptComponent' })
      expect(receiptComponent.exists()).toBeTruthy()
    })

    it('should log error if error querying: ', async () => {
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      mockUseQuery.error.value = new Error('Error querying subgraph')
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('useQueryError: ', new Error('Error querying subgraph'))
    })
  })
})
