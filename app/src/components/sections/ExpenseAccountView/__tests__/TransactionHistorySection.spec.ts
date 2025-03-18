import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransactionHistorySection from '../TransactionHistorySection.vue'
import type { ExpenseTransaction } from '@/types/transactions'
import { createTestingPinia } from '@pinia/testing'

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
})
