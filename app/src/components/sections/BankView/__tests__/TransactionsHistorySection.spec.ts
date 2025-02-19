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
    expect(rows.length).toBe(mockTransactions.length)
  })

  it('renders rows per page select with correct options', async () => {
    const wrapper = mount(TransactionsHistorySection, {
      props: {
        transactions: mockTransactions,
        isLoadingTransactions: false
      }
    })

    const select = wrapper.find("[data-test='rows-per-page-select']")
    expect(select.exists()).toBe(true)

    const options = wrapper.findAll('[data-test="rows-per-page-select"] option')
    expect(options.length).toBe(3)
    expect(options[0].text()).toBe('20')
    expect(options[1].text()).toBe('50')
    expect(options[2].text()).toBe('100')

    // Verify default value
    expect((select.element as HTMLSelectElement).value).toBe('20')
  })
})
