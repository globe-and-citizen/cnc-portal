import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import type { Address } from 'viem'
import SafeIncomingTransactions from '../SafeIncomingTransactions.vue'
import type { SafeIncomingTransfer } from '@/queries/safe.queries'

// Mock @iconify/vue
vi.mock('@iconify/vue', () => ({
  Icon: { name: 'Icon', template: '<span></span>', props: ['icon'] }
}))

// Hoisted mock variables
const { mockUseGetSafeIncomingTransfersQuery } = vi.hoisted(() => ({
  mockUseGetSafeIncomingTransfersQuery: vi.fn()
}))

// Mock external dependencies
vi.mock('@/queries/safe.queries', () => ({
  useGetSafeIncomingTransfersQuery: mockUseGetSafeIncomingTransfersQuery
}))

vi.mock('@/utils/safe', () => ({
  formatSafeTransferType: vi.fn((type: string) => {
    const types = { ETHER_TRANSFER: 'POL', ERC20_TRANSFER: 'ERC20', ERC721_TRANSFER: 'NFT' }
    return types[type as keyof typeof types] || type
  }),
  formatSafeTransferAmount: vi.fn((transfer: SafeIncomingTransfer) => {
    if (transfer.type === 'ERC721_TRANSFER') return 'NFT'
    if (transfer.type === 'ERC20_TRANSFER' && transfer.tokenInfo) {
      return `${transfer.value} ${transfer.tokenInfo.symbol}`
    }
    return `${transfer.value} POL`
  })
}))

vi.mock('@/utils/dayUtils', () => ({
  formatDateShort: vi.fn(() => 'Jan 15, 10:30 AM')
}))

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  mockTransfers: [
    {
      type: 'ETHER_TRANSFER',
      from: '0x1111111111111111111111111111111111111111',
      to: '0x1234567890123456789012345678901234567890',
      value: '1000000000000000000',
      executionDate: '2024-01-15T10:30:00Z',
      transactionHash: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc1',
      tokenInfo: null
    },
    {
      type: 'ERC20_TRANSFER',
      from: '0x2222222222222222222222222222222222222222',
      to: '0x1234567890123456789012345678901234567890',
      value: '5000000',
      executionDate: '2024-01-16T11:45:00Z',
      transactionHash: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def4',
      tokenInfo: {
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        address: '0x3333333333333333333333333333333333333333'
      }
    },
    {
      type: 'ERC721_TRANSFER',
      from: '0x4444444444444444444444444444444444444444',
      to: '0x1234567890123456789012345678901234567890',
      value: '1',
      executionDate: '2024-01-17T14:20:00Z',
      transactionHash: '0x789abc123def456abc123def456abc123def456abc123def456abc123def456a',
      tokenInfo: {
        symbol: 'NFT',
        name: 'Test NFT',
        decimals: 0,
        address: '0x5555555555555555555555555555555555555555'
      }
    }
  ] as SafeIncomingTransfer[]
} as const

// Component stubs
const CardStub = defineComponent({
  template: '<div data-test="card-component"><slot /></div>'
})

const TableStub = defineComponent({
  props: ['rows', 'columns', 'loading', 'showPagination', 'itemsPerPageProp', 'emptyState'],
  template: `
    <div data-test="table-component">
      <div v-for="row in rows" :key="row.transactionHash" data-test="table-row">
        <slot name="type-data" :row="row" />
        <slot name="from-data" :row="row" />
        <slot name="amount-data" :row="row" />
        <slot name="executionDate-data" :row="row" />
        <slot name="transactionHash-data" :row="row" />
      </div>
    </div>
  `
})

const AddressToolTipStub = defineComponent({
  props: ['address', 'slice', 'type'],
  template: '<div data-test="address-tooltip">{{ address }}</div>'
})

const createWrapper = (props = {}): VueWrapper =>
  mount(SafeIncomingTransactions, {
    props: { address: MOCK_DATA.safeAddress, ...props },
    global: {
      stubs: {
        CardComponent: CardStub,
        TableComponent: TableStub,
        AddressToolTip: AddressToolTipStub
      }
    }
  })

const setupDefaultMocks = () => {
  mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
    data: ref(MOCK_DATA.mockTransfers),
    isLoading: ref(false),
    error: ref(null)
  })
}

describe('SafeIncomingTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render transfer data correctly', () => {
      wrapper = createWrapper()
      expect(wrapper.findAll('[data-test="table-row"]')).toHaveLength(3)
    })

    it('should show loading state when data is fetching', () => {
      mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
        data: ref(null),
        isLoading: ref(true),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.findComponent(TableStub).props('loading')).toBe(true)
    })

    it('should handle empty and null data gracefully', () => {
      mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
        data: ref(null),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.findComponent(TableStub).props('rows')).toEqual([])
    })
  })

  describe('Table Configuration', () => {
    it('should configure table with correct columns', () => {
      wrapper = createWrapper()
      const columns = wrapper.findComponent(TableStub).props('columns')
      expect(columns).toEqual([
        { key: 'type', label: 'Type' },
        { key: 'from', label: 'From' },
        { key: 'amount', label: 'Amount' },
        { key: 'executionDate', label: 'Date', sortable: true },
        { key: 'transactionHash', label: 'Tx Hash' }
      ])
    })

    it('should enable pagination with correct settings', () => {
      wrapper = createWrapper()
      const table = wrapper.findComponent(TableStub)
      expect(table.props('showPagination')).toBe(true)
      expect(table.props('itemsPerPageProp')).toBe(5)
      expect(table.props('emptyState')).toEqual({ label: 'No incoming transfers found' })
    })
  })

  describe('Transfer Type Display', () => {
    it('should display correct badge styling for each transfer type', () => {
      const testCases = [
        { data: [MOCK_DATA.mockTransfers[0]], expectedClass: 'badge-success' },
        { data: [MOCK_DATA.mockTransfers[1]], expectedClass: 'badge-info' },
        { data: [MOCK_DATA.mockTransfers[2]], expectedClass: 'badge-warning' }
      ]

      testCases.forEach(({ data, expectedClass }) => {
        mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
          data: ref(data),
          isLoading: ref(false),
          error: ref(null)
        })
        wrapper = createWrapper()
        expect(wrapper.find('.badge').classes()).toContain(expectedClass)
        wrapper.unmount()
      })
    })

    it('should show token symbol for ERC20 transfers only', () => {
      mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
        data: ref([MOCK_DATA.mockTransfers[1]]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      const tokenSymbol = wrapper.find('.text-xs.text-gray-500')
      expect(tokenSymbol.exists()).toBe(true)
      expect(tokenSymbol.text()).toBe('USDC')
    })
  })

  describe('Query Integration', () => {
    it('should call query with correct parameters', () => {
      wrapper = createWrapper()
      expect(mockUseGetSafeIncomingTransfersQuery).toHaveBeenCalledWith({
        pathParams: { safeAddress: expect.any(Object) },
        queryParams: { limit: 50 }
      })
    })

    it('should update when safe address prop changes', async () => {
      wrapper = createWrapper()
      const newAddress = '0x9999999999999999999999999999999999999999' as Address
      await wrapper.setProps({ address: newAddress })
      await nextTick()
      const props = wrapper.props() as { address?: Address }
      expect(props.address).toBe(newAddress)
    })
  })

  describe('Edge Cases', () => {
    it('should handle transfers with missing tokenInfo', () => {
      mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
        data: ref([{ ...MOCK_DATA.mockTransfers[0], tokenInfo: null }]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.find('.text-xs.text-gray-500').exists()).toBe(false)
    })

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 50 }, (_, i) => ({
        ...MOCK_DATA.mockTransfers[0],
        transactionHash: `0x${i.toString().padStart(64, '0')}` as Address
      }))
      mockUseGetSafeIncomingTransfersQuery.mockReturnValue({
        data: ref(largeDataset),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.findComponent(TableStub).props('rows')).toHaveLength(50)
    })
  })

  describe('Component Stability', () => {
    it('should handle component destruction gracefully', () => {
      wrapper = createWrapper()
      expect(() => wrapper.unmount()).not.toThrow()
    })
  })
})
