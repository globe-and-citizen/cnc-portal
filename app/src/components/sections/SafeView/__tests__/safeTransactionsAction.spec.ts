import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick, ref, defineComponent } from 'vue'
import type { Address } from 'viem'
import SafeTransactions from '../SafeTransactions.vue'
import type { SafeTransaction } from '@/types/safe'

vi.mock('@iconify/vue', () => ({
  Icon: { name: 'Icon', template: '<span></span>', props: ['icon'] }
}))

const {
  mockUseTeamStore,
  mockuseGetSafeTransactionsQuery,
  mockuseGetSafeInfoQuery,
  mockUseAccount,
  mockUseSafeApproval,
  mockUseSafeExecution,
  mockUseChainId
} = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(),
  mockuseGetSafeTransactionsQuery: vi.fn(),
  mockuseGetSafeInfoQuery: vi.fn(),
  mockUseAccount: vi.fn(),
  mockUseSafeApproval: vi.fn(),
  mockUseSafeExecution: vi.fn(),
  mockUseChainId: vi.fn()
}))

vi.mock('@/stores', () => ({ useTeamStore: mockUseTeamStore }))
vi.mock('@/queries/safe.queries', () => ({
  useGetSafeTransactionsQuery: mockuseGetSafeTransactionsQuery,
  useGetSafeInfoQuery: mockuseGetSafeInfoQuery
}))
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useAccount: mockUseAccount,
    useChainId: mockUseChainId,
    createConfig: vi.fn(),
    http: vi.fn()
  }
})
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
vi.mock('@/constant', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    NETWORK: { currencySymbol: 'POL', explorerUrl: 'https://polygonscan.com' }
  }
})

// Test constants
const MOCK_DATA = {
  safeAddress: '0x1234567890123456789012345678901234567890' as Address,
  connectedAddress: '0x1111111111111111111111111111111111111111' as Address,
  mockApproveTransaction: vi.fn(),
  mockExecuteTransaction: vi.fn(),
  pendingTransaction: {
    safeTxHash: '0xpending123',
    to: '0x3333333333333333333333333333333333333333',
    value: '1000000000000000000',
    nonce: 1,
    isExecuted: false,
    confirmations: [],
    confirmationsRequired: 2,
    transactionHash: null
  } as SafeTransaction,
  readyToExecuteTransaction: {
    safeTxHash: '0xready456',
    to: '0x4444444444444444444444444444444444444444',
    value: '2000000000000000000',
    nonce: 1,
    isExecuted: false,
    confirmations: [
      { owner: '0x1111111111111111111111111111111111111111', signature: '0xsig1' },
      { owner: '0x2222222222222222222222222222222222222222', signature: '0xsig2' }
    ],
    confirmationsRequired: 2,
    transactionHash: null
  } as SafeTransaction,
  safeInfo: {
    owners: ['0x1111111111111111111111111111111111111111' as Address],
    threshold: 2,
    nonce: 1,
    address: '0x1234567890123456789012345678901234567890',
    version: '1.4.1'
  }
} as const

// Component stubs
const ComponentStubs = {
  CardComponent: defineComponent({
    template: '<div><slot /><slot name="card-action" /></div>'
  }),
  TableComponent: defineComponent({
    props: ['rows', 'loading'],
    template:
      '<div><div v-for="row in rows" :key="row.safeTxHash"><slot name="actions-data" :row="row" /></div></div>'
  }),
  ButtonUI: defineComponent({
    props: ['disabled', 'loading', 'size', 'variant'],
    emits: ['click'],
    template:
      '<button @click="$emit(\'click\')" :disabled="disabled" :data-loading="loading"><slot /></button>'
  }),
  AddressToolTip: defineComponent({ template: '<div></div>' }),
  SafeTransactionStatusFilter: defineComponent({ template: '<div></div>' }),
  SafeTransactionsWarning: defineComponent({ template: '<div></div>' })
}

describe('SafeTransactions Actions', () => {
  let wrapper: VueWrapper
  const createWrapper = (props = {}) =>
    mount(SafeTransactions, {
      props: { address: MOCK_DATA.safeAddress, ...props },
      global: { stubs: ComponentStubs }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseTeamStore.mockReturnValue({
      currentTeamMeta: { data: { safeAddress: MOCK_DATA.safeAddress } }
    })
    mockuseGetSafeInfoQuery.mockReturnValue({ data: ref(MOCK_DATA.safeInfo) })
    mockUseAccount.mockReturnValue({ address: ref(MOCK_DATA.connectedAddress) })
    mockUseChainId.mockReturnValue(ref(137))
    mockUseSafeApproval.mockReturnValue({
      approveTransaction: MOCK_DATA.mockApproveTransaction,
      isApproving: ref(false),
      error: ref(null)
    })
    mockUseSafeExecution.mockReturnValue({
      executeTransaction: MOCK_DATA.mockExecuteTransaction,
      isExecuting: ref(false),
      error: ref(null)
    })
  })

  afterEach(() => {
    if (wrapper) wrapper.unmount()
  })

  describe('Transaction Approval and Execution', () => {
    it('should approve transaction successfully and show loading state', async () => {
      MOCK_DATA.mockApproveTransaction.mockResolvedValue('0xapproval')
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.pendingTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })

      wrapper = createWrapper()
      await wrapper.vm.handleApproveTransaction(MOCK_DATA.pendingTransaction)

      expect(MOCK_DATA.mockApproveTransaction).toHaveBeenCalledWith(
        MOCK_DATA.safeAddress,
        '0xpending123'
      )

      // Test loading state
      mockUseSafeApproval.mockReturnValue({
        approveTransaction: MOCK_DATA.mockApproveTransaction,
        isApproving: ref(true),
        error: ref(null)
      })
      wrapper = createWrapper()
      wrapper.vm.approvingTransactions.add('0xpending123')
      await nextTick()
      expect(wrapper.vm.isTransactionLoading('0xpending123', 'approve')).toBe(true)
    })

    it('should execute transaction successfully and show loading state', async () => {
      MOCK_DATA.mockExecuteTransaction.mockResolvedValue('0xexecution')
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.readyToExecuteTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })

      wrapper = createWrapper()
      await wrapper.vm.handleExecuteTransaction(MOCK_DATA.readyToExecuteTransaction)

      expect(MOCK_DATA.mockExecuteTransaction).toHaveBeenCalledWith(
        MOCK_DATA.safeAddress,
        '0xready456',
        MOCK_DATA.readyToExecuteTransaction
      )

      // Test loading state
      mockUseSafeExecution.mockReturnValue({
        executeTransaction: MOCK_DATA.mockExecuteTransaction,
        isExecuting: ref(true),
        error: ref(null)
      })
      wrapper = createWrapper()
      wrapper.vm.executingTransactions.add('0xready456')
      await nextTick()
      expect(wrapper.vm.isTransactionLoading('0xready456', 'execute')).toBe(true)
    })
  })

  describe('Transaction Permissions', () => {
    it('should handle approval permissions correctly', () => {
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.pendingTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })

      // Allow approval for pending transactions
      wrapper = createWrapper()
      expect(wrapper.vm.canApprove(MOCK_DATA.pendingTransaction)).toBe(true)

      // Disallow approval for executed transactions
      const executedTransaction = { ...MOCK_DATA.pendingTransaction, isExecuted: true }
      expect(wrapper.vm.canApprove(executedTransaction)).toBe(false)
    })

    it('should handle execution permissions correctly', () => {
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.readyToExecuteTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })

      // Allow execution when threshold is met
      wrapper = createWrapper()
      expect(wrapper.vm.canExecute(MOCK_DATA.readyToExecuteTransaction)).toBe(true)

      // Disallow execution when threshold is not met
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.pendingTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.vm.canExecute(MOCK_DATA.pendingTransaction)).toBe(false)
    })

    it('should not allow actions for non-owners', () => {
      mockUseAccount.mockReturnValue({
        address: ref('0x9999999999999999999999999999999999999999' as Address)
      })
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.pendingTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })

      wrapper = createWrapper()
      expect(wrapper.vm.canApprove(MOCK_DATA.pendingTransaction)).toBe(false)
      expect(wrapper.vm.canExecute(MOCK_DATA.pendingTransaction)).toBe(false)
    })
  })

  describe('Transaction Status', () => {
    it('should return correct status for all transaction states', () => {
      const executedTransaction = { ...MOCK_DATA.pendingTransaction, isExecuted: true }

      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([executedTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.vm.getTransactionStatus(executedTransaction)).toBe('Executed')

      // Test ready to execute
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.readyToExecuteTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.vm.getTransactionStatus(MOCK_DATA.readyToExecuteTransaction)).toBe(
        'Ready to Execute'
      )

      // Test pending
      mockuseGetSafeTransactionsQuery.mockReturnValue({
        data: ref([MOCK_DATA.pendingTransaction]),
        isLoading: ref(false),
        error: ref(null)
      })
      wrapper = createWrapper()
      expect(wrapper.vm.getTransactionStatus(MOCK_DATA.pendingTransaction)).toBe('Pending')
    })
  })
})
