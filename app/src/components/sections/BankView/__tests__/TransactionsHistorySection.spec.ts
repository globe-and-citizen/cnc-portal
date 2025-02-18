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
    },
    {
      hash: '0x456',
      date: '2024-01-02',
      type: 'Transfer',
      from: '0xdef',
      to: '0xghi',
      amountUSD: 50,
      amountCAD: 67.5,
      receipt: 'receipt2.pdf'
    }
  ]

  it('renders transactions history table correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
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

  it('renders pagination controls correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const prevButton = wrapper.find('[data-test="prev-page-button"]')
    const nextButton = wrapper.find('[data-test="next-page-button"]')

    expect(prevButton.exists()).toBe(true)
    expect(nextButton.exists()).toBe(true)
  })

  it('renders export button correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
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

  it('renders date input fields correctly', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
      },
      global: {
        stubs: {
          TableComponent: true
        }
      }
    })

    const dateInputs = wrapper.findAll(
      '[data-test="start-date-input"], [data-test="end-date-input"]'
    )
    expect(dateInputs.length).toBe(2)
  })

  it('renders correct number of transaction rows', () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
      },
      global: {
        stubs: {
          TableComponent: false
        }
      }
    })

    const rows = wrapper.findAll('tbody tr')
    // Assuming one header row, so transactions + 1
    expect(rows.length).toBe(mockTransactions.length)
  })
})
