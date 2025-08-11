import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactionTable from '../InvestorsTransactionTable.vue'
import type { InvestorsTransaction } from '@/types/transactions'

// Mock utils
vi.mock('@/utils', () => ({
  formatCurrencyShort: vi.fn((amount: number) => `$${amount.toFixed(2)}`)
}))

const mockTransactions: InvestorsTransaction[] = [
  {
    txHash: '0xtxhash1',
    date: '2023-03-01 10:00:00',
    from: '0xfrom1',
    to: '0xto1',
    amount: '1.0',
    amountUSD: 1000,
    token: 'ETH',
    type: 'dividend'
  },
  {
    txHash: '0xtxhash2',
    date: '2023-03-02 11:00:00',
    from: '0xfrom2',
    to: '0xto2',
    amount: '500.0',
    amountUSD: 500,
    token: 'USDC',
    type: 'mint'
  }
]

describe('InvestorsTransactionTable.vue', () => {
  const createComponent = (transactions: InvestorsTransaction[] = mockTransactions) => {
    return mount(InvestorsTransactionTable, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      props: {
        transactions
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

  it('should define correct columns structure', () => {
    const wrapper = createComponent()
    const columns = wrapper.vm.columns

    expect(columns).toHaveLength(7)
    expect(columns).toEqual([
      { key: 'txHash', label: 'Transaction' },
      { key: 'date', label: 'Date' },
      { key: 'type', label: 'Type' },
      { key: 'from', label: 'From' },
      { key: 'to', label: 'To' },
      { key: 'amount', label: 'Amount' },
      { key: 'amountUSD', label: 'USD Value' }
    ])
  })

  it('should format USD amount correctly', () => {
    const wrapper = createComponent()
    const result = wrapper.vm.formatUSDAmount(1000.5)

    expect(result).toBe('$1000.50')
  })

  it('should format date correctly', () => {
    const wrapper = createComponent()
    const result = wrapper.vm.formatDate('2023-03-01 10:00:00')

    expect(result).toBe(new Date('2023-03-01 10:00:00').toLocaleString())
  })

  it.skip('should handle date formatting error', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = createComponent()
    const result = wrapper.vm.formatDate('invalid-date')

    expect(result).toBe('Invalid Date')
    expect(consoleSpy).toHaveBeenCalledWith('Error formatting date:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('should return correct type classes', () => {
    const wrapper = createComponent()

    expect(wrapper.vm.getTypeClass('mint')).toEqual({
      'bg-success': true,
      'bg-warning': false,
      'bg-info': false
    })

    expect(wrapper.vm.getTypeClass('dividend')).toEqual({
      'bg-success': false,
      'bg-warning': true,
      'bg-info': false
    })

    expect(wrapper.vm.getTypeClass('transfer')).toEqual({
      'bg-success': false,
      'bg-warning': false,
      'bg-info': true
    })
  })

  it('should receive transactions prop correctly', () => {
    const customTransactions = [mockTransactions[0]]
    const wrapper = createComponent(customTransactions)

    expect(wrapper.props('transactions')).toEqual(customTransactions)
  })
})
