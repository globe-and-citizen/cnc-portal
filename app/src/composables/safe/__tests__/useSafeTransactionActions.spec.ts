import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { Address } from 'viem'
import type { SafeTransaction } from '@/types/safe'
import { useSafeTransactionActions } from '../useSafeTransactionActions'

const {
  mockApproveMutate,
  mockExecuteMutate,
  mockApprovePending,
  mockExecutePending,
  mockChainId,
  mockLogError
} = vi.hoisted(() => ({
  mockApproveMutate: vi.fn(),
  mockExecuteMutate: vi.fn(),
  mockApprovePending: { value: false },
  mockExecutePending: { value: false },
  mockChainId: { value: 137 },
  mockLogError: vi.fn()
}))

vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wagmi/vue')>()
  return {
    ...actual,
    useChainId: vi.fn(() => mockChainId)
  }
})

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

vi.mock('@/utils', () => ({
  log: {
    error: mockLogError
  }
}))

const baseTransaction: SafeTransaction = {
  safe: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  value: '0',
  data: '0x',
  operation: 0,
  safeTxGas: '0',
  baseGas: '0',
  gasPrice: '0',
  gasToken: '0x0000000000000000000000000000000000000000',
  refundReceiver: null,
  nonce: 1,
  executionDate: null,
  submissionDate: '2024-01-01T00:00:00Z',
  modified: '2024-01-01T00:00:00Z',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xsafetxhash',
  proposer: null,
  proposedByDelegate: null,
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  confirmationsRequired: 2,
  confirmations: []
}

const createActions = (options?: {
  safeAddress?: Address | undefined
  willApprovalCauseConflict?: (transaction: SafeTransaction) => boolean
  hasConflictingTransactions?: (transaction: SafeTransaction) => boolean
}) =>
  useSafeTransactionActions({
    safeAddress: ref(
      options?.safeAddress ?? ('0x1111111111111111111111111111111111111111' as Address)
    ),
    willApprovalCauseConflict: options?.willApprovalCauseConflict ?? (() => false),
    hasConflictingTransactions: options?.hasConflictingTransactions ?? (() => false)
  })

describe('useSafeTransactionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApprovePending.value = false
    mockExecutePending.value = false
  })

  it('returns early when safe address is missing', () => {
    const actions = useSafeTransactionActions({
      safeAddress: ref(undefined),
      willApprovalCauseConflict: () => false,
      hasConflictingTransactions: () => false
    })

    actions.handleApproveClick(baseTransaction)
    actions.handleExecuteClick(baseTransaction)

    expect(actions.conflictActionLabel.value).toBe('Execute')
    expect(mockApproveMutate).not.toHaveBeenCalled()
    expect(mockExecuteMutate).not.toHaveBeenCalled()
  })

  it('handles approve success, rejection error, loading state, and cleanup', () => {
    mockApprovePending.value = true
    const actions = createActions()

    actions.handleApproveClick(baseTransaction)

    const callbacks = mockApproveMutate.mock.calls[0]?.[1]
    expect(mockApproveMutate).toHaveBeenCalledWith(
      {
        pathParams: {
          safeAddress: '0x1111111111111111111111111111111111111111',
          safeTxHash: '0xsafetxhash'
        },
        queryParams: {
          chainId: 137
        }
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onSettled: expect.any(Function)
      })
    )
    expect(actions.isTransactionLoading(baseTransaction.safeTxHash, 'approve')).toBe(true)

    callbacks?.onSuccess?.()
    expect(mockLogError).not.toHaveBeenCalled()

    callbacks?.onError?.(new Error('User rejected signature'))
    expect(mockLogError).toHaveBeenCalledWith('Failed to approve transaction:', expect.any(Error))

    mockApprovePending.value = false
    callbacks?.onSettled?.()
    expect(actions.isTransactionLoading(baseTransaction.safeTxHash, 'approve')).toBe(false)
  })

  it('handles execute success, generic error fallback, loading state, and cleanup', () => {
    mockExecutePending.value = true
    const actions = createActions()

    actions.handleExecuteClick(baseTransaction)

    const callbacks = mockExecuteMutate.mock.calls[0]?.[1]
    expect(mockExecuteMutate).toHaveBeenCalledWith(
      {
        pathParams: {
          safeAddress: '0x1111111111111111111111111111111111111111',
          safeTxHash: '0xsafetxhash'
        },
        queryParams: {
          chainId: 137
        },
        body: {
          transactionData: baseTransaction
        }
      },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
        onSettled: expect.any(Function)
      })
    )
    expect(actions.isTransactionLoading(baseTransaction.safeTxHash, 'execute')).toBe(true)

    callbacks?.onSuccess?.()
    expect(mockLogError).not.toHaveBeenCalled()

    callbacks?.onError?.({})
    expect(mockLogError).toHaveBeenCalledWith('Failed to execute transaction:', {})

    mockExecutePending.value = false
    callbacks?.onSettled?.()
    expect(actions.isTransactionLoading(baseTransaction.safeTxHash, 'execute')).toBe(false)
  })

  it('opens approval conflict warning and confirm executes the pending approval', () => {
    const actions = createActions({
      willApprovalCauseConflict: () => true
    })

    actions.handleApproveClick(baseTransaction)

    expect(actions.showConflictWarning.value).toBe(true)
    expect(actions.conflictActionLabel.value).toBe('Approve')
    expect(mockApproveMutate).not.toHaveBeenCalled()

    actions.handleConfirmAction()

    expect(actions.showConflictWarning.value).toBe(false)
    expect(mockApproveMutate).toHaveBeenCalledTimes(1)
  })

  it('opens execution conflict warning and cancel/confirm manage the pending execution', () => {
    const actions = createActions({
      hasConflictingTransactions: () => true
    })

    actions.handleExecuteClick(baseTransaction)

    expect(actions.showConflictWarning.value).toBe(true)
    expect(actions.conflictActionLabel.value).toBe('Execute')
    expect(mockExecuteMutate).not.toHaveBeenCalled()

    actions.handleCancelAction()
    expect(actions.showConflictWarning.value).toBe(false)
    expect(mockExecuteMutate).not.toHaveBeenCalled()

    actions.handleExecuteClick(baseTransaction)
    actions.handleConfirmAction()

    expect(actions.showConflictWarning.value).toBe(false)
    expect(mockExecuteMutate).toHaveBeenCalledTimes(1)
  })
})
