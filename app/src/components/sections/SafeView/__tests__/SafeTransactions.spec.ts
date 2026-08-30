import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import type { Address } from 'viem'
import type { SafeTransaction } from '@/types/safe'
import { mockUserStore } from '@/tests/mocks/store.mock'
import SafeTransactions from '../SafeTransactions.vue'

const {
  mockUseGetSafeTransactionsQuery,
  mockUseGetSafeInfoQuery,
  mockApproveMutate,
  mockExecuteMutate,
  mockApprovePending,
  mockExecutePending
} = vi.hoisted(() => ({
  mockUseGetSafeTransactionsQuery: vi.fn(),
  mockUseGetSafeInfoQuery: vi.fn(),
  mockApproveMutate: vi.fn(),
  mockExecuteMutate: vi.fn(),
  mockApprovePending: { value: false, __v_isRef: true },
  mockExecutePending: { value: false, __v_isRef: true }
}))

vi.mock('@/queries/safe.queries', () => ({
  useGetSafeTransactionsQuery: mockUseGetSafeTransactionsQuery,
  useGetSafeInfoQuery: mockUseGetSafeInfoQuery
}))

vi.mock('@/queries/safe.mutations', () => ({
  useApproveTransactionMutation: () => ({
    mutate: mockApproveMutate,
    isPending: mockApprovePending
  }),
  useExecuteTransactionMutation: () => ({
    mutate: mockExecuteMutate,
    isPending: mockExecutePending
  })
}))

const safeAddress = '0x2222222222222222222222222222222222222222' as Address
const ownerAddress = '0x1111111111111111111111111111111111111111' as Address

const makeTransaction = (overrides: Partial<SafeTransaction> = {}): SafeTransaction => ({
  safe: safeAddress,
  to: '0x3333333333333333333333333333333333333333',
  value: '0',
  operation: 0,
  safeTxGas: '0',
  baseGas: '0',
  gasPrice: '0',
  gasToken: '0x0000000000000000000000000000000000000000',
  nonce: 4,
  executionDate: null,
  submissionDate: '2026-08-24T10:00:00Z',
  modified: '2026-08-24T10:00:00Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xfirst',
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  confirmationsRequired: 2,
  confirmations: [],
  ...overrides
})

const MobileListStub = defineComponent({
  props: {
    transactions: { type: Array, required: true },
    actionsDisabled: { type: Boolean, required: false }
  },
  emits: ['view', 'approve', 'execute'],
  template: `<div data-test="mobile-list-stub">
    <button data-test="approve-transaction" @click="$emit('approve', transactions[0].transaction)">Approve</button>
    <button data-test="execute-transaction" @click="$emit('execute', transactions[0].transaction)">Execute</button>
  </div>`
})

const WarningStub = defineComponent({
  props: {
    modelValue: { type: Boolean, required: true },
    action: { type: String, required: true }
  },
  emits: ['confirm', 'update:modelValue'],
  template: `<div data-test="warning-stub">
    <button data-test="confirm-warning" @click="$emit('confirm')">Confirm</button>
    <button data-test="cancel-warning" @click="$emit('update:modelValue', false)">Cancel</button>
  </div>`
})

describe('SafeTransactions', () => {
  let wrapper: VueWrapper | undefined
  const transactions = ref<SafeTransaction[]>([])

  const createWrapper = () =>
    mount(SafeTransactions, {
      props: { address: safeAddress },
      global: {
        stubs: {
          SafeTransactionMobileList: MobileListStub,
          SafeTransactionsWarning: WarningStub,
          SafeTransactionStatusFilter: true,
          SafeTransactionFeedback: true,
          SafeTransactionDetailsModal: true,
          SafeTransactionActions: true,
          SafeTransactionsTable: true,
          TablePagination: true,
          AddressTooltip: true,
          UTable: true
        }
      }
    })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUserStore.address = ownerAddress
    transactions.value = [makeTransaction()]
    mockUseGetSafeTransactionsQuery.mockReturnValue({
      data: transactions,
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })
    mockUseGetSafeInfoQuery.mockReturnValue({
      data: ref({ owners: [ownerAddress], threshold: 2, nonce: 3 })
    })
    mockApprovePending.value = false
    mockExecutePending.value = false
  })

  afterEach(() => wrapper?.unmount())

  it('passes precomputed transaction rows to the mobile list', () => {
    wrapper = createWrapper()

    const mobileListProps = wrapper.findComponent(MobileListStub).props()
    expect(mobileListProps.transactions).toHaveLength(1)
    expect(mobileListProps).not.toHaveProperty('getState')
    expect(mobileListProps).not.toHaveProperty('getPermissions')
    expect(mobileListProps).not.toHaveProperty('isTransactionLoading')
  })

  it('requires confirmation before approving when another valid transaction is pending', async () => {
    transactions.value = [
      makeTransaction({
        confirmations: [
          {
            owner: ownerAddress,
            submissionDate: '2026-08-24T10:00:00Z',
            transactionHash: null,
            signature: '0xsignature',
            signatureType: 'ETH_SIGN'
          }
        ]
      }),
      makeTransaction({ safeTxHash: '0xsecond', nonce: 5 })
    ]
    wrapper = createWrapper()

    await wrapper.get('[data-test="approve-transaction"]').trigger('click')

    expect(mockApproveMutate).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="conflict-warning-modal"]').exists()).toBe(true)

    await wrapper.get('[data-test="confirm-warning"]').trigger('click')

    expect(mockApproveMutate).toHaveBeenCalledWith(
      {
        pathParams: { safeAddress, safeTxHash: '0xfirst' },
        queryParams: { chainId: expect.any(Number) }
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onSettled: expect.any(Function)
      })
    )
  })

  it('executes directly when no conflict warning is required', async () => {
    wrapper = createWrapper()

    await wrapper.get('[data-test="execute-transaction"]').trigger('click')
    await nextTick()

    expect(mockExecuteMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        pathParams: { safeAddress, safeTxHash: '0xfirst' },
        body: { transactionData: transactions.value[0] }
      }),
      expect.objectContaining({ onSettled: expect.any(Function) })
    )
    expect(wrapper.find('[data-test="conflict-warning-modal"]').exists()).toBe(false)
  })

  it('cancels a pending conflict action without sending a mutation', async () => {
    transactions.value = [
      makeTransaction({
        confirmations: [
          {
            owner: ownerAddress,
            submissionDate: '2026-08-24T10:00:00Z',
            transactionHash: null,
            signature: '0xsignature',
            signatureType: 'ETH_SIGN'
          }
        ]
      }),
      makeTransaction({ safeTxHash: '0xsecond', nonce: 5 })
    ]
    wrapper = createWrapper()

    await wrapper.get('[data-test="approve-transaction"]').trigger('click')
    await wrapper.get('[data-test="cancel-warning"]').trigger('click')

    expect(mockApproveMutate).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="conflict-warning-modal"]').exists()).toBe(false)
  })
})
