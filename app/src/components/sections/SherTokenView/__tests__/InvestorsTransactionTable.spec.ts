import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactionTable from '../InvestorsTransactionTable.vue'
import type { InvestorsTransaction } from '@/types/transactions'

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
      { accessorKey: 'txHash', header: 'Transaction' },
      { accessorKey: 'date', header: 'Date' },
      { accessorKey: 'type', header: 'Type' },
      { accessorKey: 'from', header: 'From' },
      { accessorKey: 'to', header: 'To' },
      { accessorKey: 'amount', header: 'Amount' },
      { accessorKey: 'amountUSD', header: 'USD Value' }
    ])
  })

  it('should format date correctly', () => {
    const wrapper = createComponent()
    const result = wrapper.vm.formatDate('2023-03-01 10:00:00')

    expect(result).toBe(new Date('2023-03-01 10:00:00').toLocaleString())
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
