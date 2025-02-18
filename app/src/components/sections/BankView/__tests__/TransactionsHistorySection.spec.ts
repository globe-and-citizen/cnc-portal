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

    expect(wrapper.find('h3').text()).toBe('Bank Transactions History')
  })
})
