import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSafeTransfer } from '../useSafeTransfer'

const mockMutateAsync = vi.fn()
const isPending = ref(false)
const error = ref<Error | null>(null)

vi.mock('@/queries/safe.transfer.mutations', () => ({
  useTransferFromSafeMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending,
    error
  })
}))

describe('useSafeTransfer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
    error.value = null
    vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  })

  it('returns null for invalid recipient', async () => {
    const { transferFromSafe } = useSafeTransfer()

    const result = await transferFromSafe('0x1111111111111111111111111111111111111111', {
      to: 'invalid',
      amount: '1',
      tokenId: 'native'
    })

    expect(result).toBeNull()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('calls transfer mutation and returns result', async () => {
    mockMutateAsync.mockResolvedValueOnce('0xtx')
    const { transferFromSafe } = useSafeTransfer()

    const result = await transferFromSafe('0x1111111111111111111111111111111111111111', {
      to: '0x2222222222222222222222222222222222222222',
      amount: '1',
      tokenId: 'native'
    })

    expect(result).toBe('0xtx')
    expect(mockMutateAsync).toHaveBeenCalledWith({
      safeAddress: '0x1111111111111111111111111111111111111111',
      options: {
        to: '0x2222222222222222222222222222222222222222',
        amount: '1',
        tokenId: 'native'
      }
    })
  })

  it('exposes mutation state', () => {
    isPending.value = true
    error.value = new Error('boom')

    const { isTransferring, error: exposedError } = useSafeTransfer()

    expect(isTransferring.value).toBe(true)
    expect(exposedError.value?.message).toBe('boom')
  })
})
