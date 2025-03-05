import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import TransactionHistorySection from '../TransactionHistorySection.vue'
import type { BaseTransaction, ExpenseTransaction } from '@/types/transactions'
import ButtonUI from '@/components/ButtonUI.vue'
import ReceiptComponent from '@/components/sections/ExpenseAccountView/ReceiptComponent.vue'
import TableComponent from '@/components/TableComponent.vue'
import { ref, type ComponentPublicInstance } from 'vue'

const mockUseQuery = {
  result: ref({
    transfers: [
      {
        amount: '7000000',
        blockNumber: '33',
        blockTimestamp: '1741077830',
        contractAddress: '0x552a6b9d3c6ef286fb40eeae9e8cfecdab468c0a',
        contractType: 'ExpenseAccountEIP712',
        from: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        id: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a01000000',
        to: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        tokenAddress: '0x59b670e9fa9d0a427751af201d676719a970857b',
        transactionHash: '0xe5a1940c7d5b338a4383fed25d08d338efe17a40cd94d66677f374a81c0d2d3a',
        __typename: 'Transfer'
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
  const defaultProps = {
    currencyRates: {
      loading: false as const,
      error: null as null,
      getRate: () => 1
    }
  }

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

  it('renders correctly', () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('displays transaction history component', () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })
    expect(wrapper.find('[data-test="expense-transactions"]').exists()).toBe(true)
  })

  it('handles receipt click', async () => {
    const wrapper = mount(TransactionHistorySection, {
      props: defaultProps,
      global: {
        stubs: {
          GenericTransactionHistory: true
        }
      }
    })

    interface TransactionHistorySection extends ComponentPublicInstance {
      handleReceiptClick: (transaction: BaseTransaction) => void
    }
    const consoleSpy = vi.spyOn(console, 'log')
    await (wrapper.vm as unknown as TransactionHistorySection).handleReceiptClick(
      mockTransactions[0]
    )
    expect(consoleSpy).toHaveBeenCalledWith('Receipt clicked:', mockTransactions[0])
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
        props: { ...props, currencyRates: defaultProps.currencyRates },
        data,
        global: { ...global }
      })

    it('should show receipt when receipt is clicked', async () => {
      const wrapper =
        createComponent(/*{
        data: () => ({
          transactions: [
            {
              txHash: '0xfc9fc4e2c32197c0868a96134b027755e5f7eacb88ffdb7c8e70a27f38d5b55e',
              date: Date.now(),
              type: 'deposit',
              from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
              to: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
              amountUSD: 10,
              amount: '0.01',
              token: 'POL'
            }
          ]
        })
      }*/)
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
  })
})
