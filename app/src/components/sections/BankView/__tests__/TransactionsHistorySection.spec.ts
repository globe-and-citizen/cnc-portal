import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionsHistorySection from '../TransactionsHistorySection.vue'
import type { Transaction } from '@/types/transaction'

describe('TransactionsHistorySection', () => {
  const mockTransactions: Transaction[] = [
    {
      hash: '0x123',
      date: '2024-01-01',
      type: 'Deposit',
      from: '0xabc',
      to: '0xdef',
      amountUSD: 100,
      amountCAD: 135,
      receipt: 'receipt1.pdf'
    }
  ]

  it('renders transactions history table correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false,
        currencyRates: {
          loading: false,
          error: null,
          getRate: () => 1
        }
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    expect(wrapper.find('[data-test="transactions-history-title"]').text()).toBe(
      'Bank Transactions History'
    )
  })

  it('renders export button correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false,
        currencyRates: {
          loading: false,
          error: null,
          getRate: () => 1
        }
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const exportButton = wrapper.find('[data-test="export-button"]')
    expect(exportButton.exists()).toBe(true)
  })

  it('renders correct number of transaction rows', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false,
        currencyRates: {
          loading: false,
          error: null,
          getRate: () => 1
        }
      },
      global: {
        stubs: {
          TableComponent: false
        }
      }
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows.length).toBe(mockTransactions.length)
  })
})
