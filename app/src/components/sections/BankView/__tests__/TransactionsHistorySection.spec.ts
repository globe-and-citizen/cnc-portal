import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransactionHistorySection from '@/components/sections/BankView/TransactionsHistorySection.vue'
import type { ExpenseTransaction } from '@/types/transactions'
import ButtonUI from '@/components/ButtonUI.vue'
import ReceiptComponent from '@/components/ReceiptComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import { ref } from 'vue'
import { createTestingPinia } from '@pinia/testing'
import * as utils from '@/utils'

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
  error: ref<Error | null>(),
  loading: ref(false)
}

vi.mock('@vue/apollo-composable', async (importOriginal) => {
  const original: object = await importOriginal()
  return {
    ...original,
    useQuery: vi.fn(() => ({ ...mockUseQuery }))
  }
})

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
    const wrapper = mount(TransactionHistorySection)
    await flushPromises()
    // expect(wrapper.find('[data-test="expense-transactions"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'GenericTransactionHistory' }).exists()).toBe(true)
  })

  it.skip('handles receipt click', async () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })

    //@ts-expect-error: not visible on wrapper
    wrapper.vm.handleReceiptClick(mockTransactions[0])
    //@ts-expect-error: not visible on wrapper
    expect(wrapper.vm.selectedTransaction).toEqual({
      ...mockTransactions[0],
      USDC: '100',
      status: 'completed'
    })
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
        global: { ...global }
      })

    it('should show receipt when receipt is clicked', async () => {
      const wrapper = createComponent()
      await flushPromises()

      const transactionTable = wrapper.findComponent(TableComponent)
      expect(transactionTable.exists()).toBeTruthy()
      expect(transactionTable.find('[data-test="table"]').exists()).toBeTruthy()
      const firstRow = transactionTable.find('[data-test="0-row"]')
      expect(firstRow.exists()).toBeTruthy()
      const receiptButton = firstRow.findComponent(ButtonUI)
      expect(receiptButton.exists()).toBeTruthy()
      await receiptButton.trigger('click')

      await flushPromises()
      const receiptComponent = wrapper.findComponent(ReceiptComponent)
      expect(receiptComponent.exists()).toBeTruthy()
    })

    it('should log error if error querying: ', async () => {
      const logErrorSpy = vi.spyOn(utils.log, 'error')
      const wrapper = createComponent()
      wrapper.vm.error = new Error('Error querying subgraph')
      await flushPromises()
      expect(logErrorSpy).toBeCalledWith('useQueryError: ', new Error('Error querying subgraph'))
    })
  })
})
