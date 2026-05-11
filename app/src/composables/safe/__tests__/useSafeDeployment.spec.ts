import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSafeDeployment } from '../useSafeDeployment'

const mockMutateAsync = vi.fn()
const isPending = ref(false)
const error = ref<Error | null>(null)

vi.mock('@/queries/safe.mutations', () => ({
  useDeploySafeMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending,
    error
  })
}))

describe('useSafeDeployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isPending.value = false
    error.value = null
    vi.stubGlobal('useToast', () => ({ add: vi.fn() }))
  })

  it('returns null for empty owners', async () => {
    const { deploySafe } = useSafeDeployment()

    const result = await deploySafe([], 1)

    expect(result).toBeNull()
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  it('calls mutation and returns safe address', async () => {
    mockMutateAsync.mockResolvedValueOnce('0x1111111111111111111111111111111111111111')
    const { deploySafe } = useSafeDeployment()

    const result = await deploySafe(['0x1111111111111111111111111111111111111111'], 1)

    expect(result).toBe('0x1111111111111111111111111111111111111111')
    expect(mockMutateAsync).toHaveBeenCalledWith({
      owners: ['0x1111111111111111111111111111111111111111'],
      threshold: 1
    })
  })

  it('exposes mutation state', () => {
    isPending.value = true
    error.value = new Error('boom')

    const { isDeploying, error: exposedError } = useSafeDeployment()

    expect(isDeploying.value).toBe(true)
    expect(exposedError.value?.message).toBe('boom')
  })
})
