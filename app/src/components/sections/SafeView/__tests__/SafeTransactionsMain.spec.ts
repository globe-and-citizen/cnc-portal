import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import type { Address } from 'viem'
import SafeTransactions from '../SafeTransactions.vue'
import type { SafeTransaction } from '@/types/safe'

// Mock @iconify/vue
vi.mock('@iconify/vue', () => ({
  Icon: {
    name: 'Icon',
    template: '<span></span>',
    props: ['icon']
  }
}))

// Hoisted mock variables following CNC Portal patterns
const {
  mockUseTeamStore,
  mockUseSafeTransactionsQuery,
  mockUseSafeInfoQuery,
  mockUseAccount,
  mockUseSafeApproval,
  mockUseSafeExecution
} = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(),
  mockUseSafeTransactionsQuery: vi.fn(),
  mockUseSafeInfoQuery: vi.fn(),
  mockUseAccount: vi.fn(),
  mockUseSafeApproval: vi.fn(),
  mockUseSafeExecution: vi.fn()
}))

vi.mock('@/queries/safe.queries', () => ({
  useSafeTransactionsQuery: mockUseSafeTransactionsQuery,
  useSafeInfoQuery: mockUseSafeInfoQuery
}))

vi.mock('@wagmi/vue', () => ({
  useAccount: mockUseAccount
}))

vi.mock('@/composables/safe', () => ({
  useSafeApproval: mockUseSafeApproval,
  useSafeExecution: mockUseSafeExecution
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    formatEther: vi.fn((value: bigint) => (Number(value) / 10 ** 18).toString())
  }
})

// Test constants following CNC Portal patterns
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  connectedAddress: '0x1111111111111111111111111111111111111111' as Address,
  otherAddress: '0x2222222222222222222222222222222222222222' as Address,
  safeTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  txHash: '0x9876543210987654321098765432109876543210987654321098765432109876',
  mockTransactions: [
    {
      safeTxHash: '0xpending123',
      to: '0x3333333333333333333333333333333333333333',
      value: '1000000000000000000',
      isExecuted: false,
      confirmations: [{ owner: '0x1111111111111111111111111111111111111111', signature: '0xsig1' }],
      confirmationsRequired: 2,
      transactionHash: null,
      dataDecoded: { method: 'transfer' }
    },
    {
      safeTxHash: '0xexecuted456',
      to: '0x4444444444444444444444444444444444444444',
      value: '2000000000000000000',
      isExecuted: true,
      confirmations: [
        { owner: '0x1111111111111111111111111111111111111111', signature: '0xsig1' },
        { owner: '0x2222222222222222222222222222222222222222', signature: '0xsig2' }
      ],
      confirmationsRequired: 2,
      transactionHash: '0xtxhash456',
      dataDecoded: { method: 'approve' }
    }
  ] as SafeTransaction[],
  safeInfo: {
    owners: [
      '0x1111111111111111111111111111111111111111' as Address,
      '0x2222222222222222222222222222222222222222' as Address
    ],
    threshold: 2,
    nonce: 1,
    address: '0x1234567890123456789012345678901234567890',
    version: '1.4.1'
  }
} as const

// Test selectors following CNC Portal patterns
const SELECTORS = {
  table: '[data-test="safe-transactions-table"]',
  approveButton: '[data-test="approve-button"]',
  executeButton: '[data-test="execute-button"]',
  explorerLink: '[data-test="explorer-link"]',
  statusFilter: '[data-test="status-filter"]'
} as const

// Component stubs following project patterns
const CardStub = defineComponent({
  template: '<div data-test="card-component"><slot /><slot name="card-action" /></div>'
})

const TableStub = defineComponent({
  props: ['rows', 'columns', 'loading', 'currentPageProp', 'itemsPerPageProp'],
  emits: ['update:currentPage', 'update:itemsPerPage'],
  template: `
    <div data-test="table-component">
      <div v-for="row in rows" :key="row.safeTxHash" data-test="table-row">
        <slot name="to-data" :row="row" />
        <slot name="value-data" :row="row" />
        <slot name="status-data" :row="row" />
        <slot name="txHash-data" :row="row" />
        <slot name="method-data" :row="row" />
        <slot name="actions-data" :row="row" />
      </div>
    </div>
  `
})

const SafeTransactionStatusFilterStub = defineComponent({
  emits: ['statusChange'],
  template:
    '<div data-test="status-filter" @click="$emit(\'statusChange\', \'pending\')">Filter</div>'
})

const createWrapper = (props = {}) =>
  mount(SafeTransactions, {
    props,
    global: {
      stubs: {
        CardComponent: CardStub,
        TableComponent: TableStub,
        ButtonUI: defineComponent({ template: '<button><slot /></button>' }),
        AddressToolTip: defineComponent({ template: '<div></div>' }),
        SafeTransactionStatusFilter: SafeTransactionStatusFilterStub
      }
    }
  })

const setupDefaultMocks = () => {
  mockUseTeamStore.mockReturnValue({
    currentTeamMeta: {
      data: { safeAddress: MOCK_DATA.safeAddress }
    }
  })

  mockUseSafeTransactionsQuery.mockReturnValue({
    data: ref(MOCK_DATA.mockTransactions),
    isLoading: ref(false),
    error: ref(null)
  })

  mockUseSafeInfoQuery.mockReturnValue({
    data: ref(MOCK_DATA.safeInfo)
  })

  mockUseAccount.mockReturnValue({
    address: ref(MOCK_DATA.connectedAddress)
  })

  mockUseSafeApproval.mockReturnValue({
    approveTransaction: vi.fn().mockResolvedValue('0xapproval'),
    isApproving: ref(false),
    error: ref(null)
  })

  mockUseSafeExecution.mockReturnValue({
    executeTransaction: vi.fn().mockResolvedValue('0xexecution'),
    isExecuting: ref(false),
    error: ref(null)
  })
}

describe('SafeTransactions', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Component Rendering', () => {
    it('should render the component with all required elements', () => {
      wrapper = createWrapper()

      expect(wrapper.find('[data-test="card-component"]').exists()).toBe(true)
      expect(wrapper.find(SELECTORS.table).exists()).toBe(true)
    })

    it('should render transaction data correctly', () => {
      wrapper = createWrapper()

      const tableRows = wrapper.findAll('[data-test="table-row"]')
      expect(tableRows).toHaveLength(2)
    })

    it('should show loading state when data is fetching', () => {
      mockUseSafeTransactionsQuery.mockReturnValue({
        data: ref(null),
        isLoading: ref(true),
        error: ref(null)
      })

      wrapper = createWrapper()

      expect(wrapper.findComponent(TableStub).props('loading')).toBe(true)
    })

    it('should handle empty transactions array', () => {
      mockUseSafeTransactionsQuery.mockReturnValue({
        data: ref([]),
        isLoading: ref(false),
        error: ref(null)
      })

      wrapper = createWrapper()

      const tableComponent = wrapper.findComponent(TableStub)
      expect(tableComponent.props('rows')).toEqual([])
    })
  })

  describe('Transaction Status Filtering', () => {
    it('should filter pending transactions correctly', async () => {
      wrapper = createWrapper()

      const statusFilter = wrapper.findComponent(SafeTransactionStatusFilterStub)
      await statusFilter.vm.$emit('statusChange', 'pending')
      await nextTick()

      const tableComponent = wrapper.findComponent(TableStub)
      const filteredRows = tableComponent.props('rows')

      expect(filteredRows).toHaveLength(1)
      expect(filteredRows[0].safeTxHash).toBe('0xpending123')
    })

    it('should filter executed transactions correctly', async () => {
      wrapper = createWrapper()

      const statusFilter = wrapper.findComponent(SafeTransactionStatusFilterStub)
      await statusFilter.vm.$emit('statusChange', 'executed')
      await nextTick()

      const tableComponent = wrapper.findComponent(TableStub)
      const filteredRows = tableComponent.props('rows')

      expect(filteredRows).toHaveLength(1)
      expect(filteredRows[0].safeTxHash).toBe('0xexecuted456')
    })

    it('should show all transactions when filter is set to all', async () => {
      wrapper = createWrapper()

      const statusFilter = wrapper.findComponent(SafeTransactionStatusFilterStub)
      await statusFilter.vm.$emit('statusChange', 'all')
      await nextTick()

      const tableComponent = wrapper.findComponent(TableStub)
      const filteredRows = tableComponent.props('rows')

      expect(filteredRows).toHaveLength(2)
    })

    it('should reset pagination when filter changes', async () => {
      wrapper = createWrapper()

      // Simulate being on page 2
      wrapper.vm.currentPage = 2

      const statusFilter = wrapper.findComponent(SafeTransactionStatusFilterStub)
      await statusFilter.vm.$emit('statusChange', 'pending')
      await nextTick()

      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('Pagination Handling', () => {
    it('should handle page change correctly', async () => {
      wrapper = createWrapper()

      const tableComponent = wrapper.findComponent(TableStub)
      await tableComponent.vm.$emit('update:currentPage', 2)
      await nextTick()

      expect(wrapper.vm.currentPage).toBe(2)
    })

    it('should handle items per page change correctly', async () => {
      wrapper = createWrapper()

      const tableComponent = wrapper.findComponent(TableStub)
      await tableComponent.vm.$emit('update:itemsPerPage', 10)
      await nextTick()

      expect(wrapper.vm.itemsPerPage).toBe(10)
      expect(wrapper.vm.currentPage).toBe(1) // Should reset to page 1
    })

    it('should reset to page 1 when filtered data changes significantly', async () => {
      wrapper = createWrapper()

      // Set to a high page number
      wrapper.vm.currentPage = 5
      // Change to a filter with fewer results
      const statusFilter = wrapper.findComponent(SafeTransactionStatusFilterStub)
      await statusFilter.vm.$emit('statusChange', 'executed')
      await nextTick()
      expect(wrapper.vm.currentPage).toBe(1)
    })
  })

  describe('User Permissions', () => {
    it('should recognize connected user as owner', () => {
      wrapper = createWrapper()
      expect(wrapper.vm.isConnectedUserOwner).toBe(true)
    })

    it('should handle missing safe info gracefully', () => {
      mockUseSafeInfoQuery.mockReturnValue({
        data: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.vm.isConnectedUserOwner).toBe(false)
    })
  })
})
