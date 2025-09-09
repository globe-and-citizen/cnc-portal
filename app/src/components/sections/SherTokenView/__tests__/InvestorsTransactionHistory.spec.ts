import { afterEach, describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import InvestorsTransactionHistory from '@/components/sections/SherTokenView/InvestorsTransactionHistory.vue'
import InvestorsTransactionFilter from '@/components/sections/SherTokenView/InvestorsTransactionFilter.vue'
import InvestorsTransactionTable from '@/components/sections/SherTokenView/InvestorsTransactionTable.vue'
import CardComponent from '@/components/CardComponent.vue'
import type { InvestorsTransaction } from '@/types/transactions'

// Mock any external dependencies that child components might need

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
  },
  {
    txHash: '0xtxhash3',
    date: '2023-03-03 12:00:00',
    from: '0xfrom3',
    to: '0xto3',
    amount: '200.0',
    amountUSD: 200,
    token: 'ETH',
    type: 'transfer'
  }
]

interface ComponentData {
  dateRange: [Date, Date] | null
  selectedType: string
  typeDropdownOpen: boolean
  uniqueTypes: string[]
  displayedTransactions: InvestorsTransaction[]
}

describe('InvestorsTransactionHistory.vue', () => {
  const defaultProps = {
    transactions: mockTransactions,
    title: 'Transaction History',
    showDateFilter: true,
    dataTestPrefix: 'test-prefix'
  }

  const createComponent = (props = defaultProps) => {
    return shallowMount(InvestorsTransactionHistory, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })],
        components: {
          CardComponent,
          InvestorsTransactionFilter,
          InvestorsTransactionTable
        }
      },
      props
    })
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should mount properly', () => {
    const wrapper = createComponent()
    expect(wrapper.exists()).toBeTruthy()
  })

  it('should compute unique types correctly', () => {
    const wrapper = createComponent()
    const uniqueTypes = (wrapper.vm as unknown as ComponentData).uniqueTypes

    expect(uniqueTypes).toEqual(expect.arrayContaining(['dividend', 'mint', 'transfer']))
  })

  it('should filter transactions by type', async () => {
    const wrapper = createComponent()

    // Set type filter
    ;(wrapper.vm as unknown as ComponentData).selectedType = 'dividend'

    await wrapper.vm.$nextTick()

    const displayedTransactions = (wrapper.vm as unknown as ComponentData).displayedTransactions
    expect(displayedTransactions).toHaveLength(1)
    expect(displayedTransactions[0].type).toBe('dividend')
  })

  it('should filter transactions by both date and type', async () => {
    const wrapper = createComponent()

    // Set both filters
    const startDate = new Date('2023-03-01')
    const endDate = new Date('2023-03-03')
    ;(wrapper.vm as unknown as ComponentData).dateRange = [startDate, endDate]
    ;(wrapper.vm as unknown as ComponentData).selectedType = 'mint'

    await wrapper.vm.$nextTick()

    const displayedTransactions = (wrapper.vm as unknown as ComponentData).displayedTransactions
    expect(displayedTransactions).toHaveLength(1)
    expect(displayedTransactions[0].type).toBe('mint')
  })

  it('should reset filters correctly', async () => {
    const wrapper = createComponent()

    // Set filters
    ;(wrapper.vm as unknown as ComponentData).selectedType = 'dividend'
    ;(wrapper.vm as unknown as ComponentData).dateRange = [
      new Date('2023-03-01'),
      new Date('2023-03-02')
    ]

    await wrapper.vm.$nextTick()

    // Reset filters
    ;(wrapper.vm as unknown as ComponentData).selectedType = ''
    ;(wrapper.vm as unknown as ComponentData).dateRange = null

    await wrapper.vm.$nextTick()

    const displayedTransactions = (wrapper.vm as unknown as ComponentData).displayedTransactions
    expect(displayedTransactions).toHaveLength(3)
  })

  it('should maintain unique types when transactions change', async () => {
    const wrapper = createComponent()

    // Change transactions prop
    await wrapper.setProps({
      transactions: [
        { ...mockTransactions[0], type: 'newType' },
        { ...mockTransactions[1], type: 'anotherType' }
      ]
    })

    const uniqueTypes = (wrapper.vm as unknown as ComponentData).uniqueTypes
    expect(uniqueTypes).toEqual(expect.arrayContaining(['newType', 'anotherType']))
  })
})
