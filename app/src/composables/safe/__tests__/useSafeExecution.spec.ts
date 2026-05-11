import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSafeExecution } from '../useSafeExecution'
import type { SafeTransaction } from '@/types/safe'

const mockMutateAsync = vi.fn()
const isPending = ref(false)
const error = ref<Error | null>(null)

vi.mock('@/queries/safe.mutations', () => ({
  useExecuteTransactionMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending,
    error
  })
}))

const transaction = {
  safe: '0x1111111111111111111111111111111111111111',
  to: '0x2222222222222222222222222222222222222222',
  value: '0',
  operation: 0,
  safeTxGas: '0',
  baseGas: '0',
  gasPrice: '0',
  gasToken: '0x0000000000000000000000000000000000000000',
  nonce: 1,
  executionDate: null,
  submissionDate: '',
  modified: '',
  blockNumber: null,
  transactionHash: null,
  safeTxHash: '0xhash',
  executor: null,
  isExecuted: false,
  isSuccessful: null,
  confirmationsRequired: 1,
  confirmations: []
} as SafeTransaction

describe('useSafeExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
    error.value = null
    vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  })

  it('returns null when transaction data is missing', async () => {
    const { executeTransaction } = useSafeExecution()

    const result = await executeTransaction('0x1111111111111111111111111111111111111111', '0xhash')

    expect(result).toBeNull()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('calls mutation and returns hash', async () => {
    mockMutateAsync.mockResolvedValueOnce('0xtx')
    const { executeTransaction } = useSafeExecution()

    const result = await executeTransaction(
      '0x1111111111111111111111111111111111111111',
      '0xhash',
      transaction
    )

    expect(result).toBe('0xtx')
    expect(mockMutateAsync).toHaveBeenCalledWith({
      safeAddress: '0x1111111111111111111111111111111111111111',
      safeTxHash: '0xhash',
      transactionData: transaction
    })
  })

  it('exposes mutation state', () => {
    isPending.value = true
    error.value = new Error('boom')

    const { isExecuting, error: exposedError } = useSafeExecution()

    expect(isExecuting.value).toBe(true)
    expect(exposedError.value?.message).toBe('boom')
  })
})
