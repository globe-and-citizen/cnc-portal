import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { vi } from 'vitest'
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
export const {
  mockUseTeamStore,
  mockuseGetSafeTransactionsQuery,
  mockuseGetSafeInfoQuery,
  mockUseAccount,
  mockUseSafeApproval,
  mockUseSafeExecution
} = vi.hoisted(() => ({
  mockUseTeamStore: vi.fn(),
  mockuseGetSafeTransactionsQuery: vi.fn(),
  mockuseGetSafeInfoQuery: vi.fn(),
  mockUseAccount: vi.fn(),
  mockUseSafeApproval: vi.fn(),
  mockUseSafeExecution: vi.fn()
}))

// Mock external dependencies
vi.mock('@/stores', () => ({
  useTeamStore: mockUseTeamStore
}))

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeTransactionsQuery: mockuseGetSafeTransactionsQuery,
  useGetSafeInfoQuery: mockuseGetSafeInfoQuery
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
export const MOCK_DATA = {
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
export const SELECTORS = {
  table: '[data-test="safe-transactions-table"]',
  approveButton: '[data-test="approve-button"]',
  executeButton: '[data-test="execute-button"]',
  explorerLink: '[data-test="explorer-link"]',
  statusFilter: '[data-test="status-filter"]'
} as const

// Component stubs following project patterns
export const CardStub = defineComponent({
  template: '<div data-test="card-component"><slot /><slot name="card-action" /></div>'
})

export const TableStub = defineComponent({
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

export const ButtonStub = defineComponent({
  props: ['size', 'variant', 'disabled', 'loading'],
  emits: ['click'],
  template:
    '<button data-test="button" @click="$emit(\'click\')" :disabled="disabled"><slot /></button>'
})

export const AddressToolTipStub = defineComponent({
  props: ['address', 'slice', 'type'],
  template: '<div data-test="address-tooltip">{{ address }}</div>'
})

export const SafeTransactionStatusFilterStub = defineComponent({
  emits: ['statusChange'],
  template:
    '<div data-test="status-filter" @click="$emit(\'statusChange\', \'pending\')">Filter</div>'
})

export const createWrapper = (props = {}): VueWrapper =>
  mount(SafeTransactions, {
    props,
    global: {
      stubs: {
        CardComponent: CardStub,
        TableComponent: TableStub,
        ButtonUI: ButtonStub,
        AddressToolTip: AddressToolTipStub,
        SafeTransactionStatusFilter: SafeTransactionStatusFilterStub
      }
    }
  })

export const setupDefaultMocks = () => {
  mockUseTeamStore.mockReturnValue({
    currentTeamMeta: {
      data: { safeAddress: MOCK_DATA.safeAddress }
    }
  })

  mockuseGetSafeTransactionsQuery.mockReturnValue({
    data: ref(MOCK_DATA.mockTransactions),
    isLoading: ref(false),
    error: ref(null)
  })

  mockuseGetSafeInfoQuery.mockReturnValue({
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
