import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSafeApproval } from '../useSafeApproval'

const mockMutateAsync = vi.fn()
const isPending = ref(false)
const error = ref<Error | null>(null)
const addToast = vi.fn()

vi.mock('@/queries/safe.mutations', () => ({
  useApproveTransactionMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending,
    error
  })
}))

describe('useSafeApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
    error.value = null
    vi.stubGlobal('useToast', () => ({ add: addToast }))
  })

  it('returns null for invalid address', async () => {
    const { approveTransaction } = useSafeApproval()

    const result = await approveTransaction('invalid', '0xhash')

    expect(result).toBeNull()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('calls mutation and returns signature', async () => {
    mockMutateAsync.mockResolvedValueOnce('0xsig')
    const { approveTransaction } = useSafeApproval()

    const result = await approveTransaction('0x1111111111111111111111111111111111111111', '0xhash')

    expect(result).toBe('0xsig')
    expect(mockMutateAsync).toHaveBeenCalledWith({
      safeAddress: '0x1111111111111111111111111111111111111111',
      safeTxHash: '0xhash'
    })
  })

  it('exposes mutation state', () => {
    isPending.value = true
    error.value = new Error('boom')

    const { isApproving, error: exposedError } = useSafeApproval()

    expect(isApproving.value).toBe(true)
    expect(exposedError.value?.message).toBe('boom')
  })
})
