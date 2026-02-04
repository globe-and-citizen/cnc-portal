import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAddAction } from '../bod'
import { readContract } from '@wagmi/core'
import { ref } from 'vue'
import { useCreateActionMutation } from '@/queries/action.queries'

// Mock external dependencies
vi.mock('@wagmi/core', () => ({
  readContract: vi.fn()
}))

const mockUseReadContract = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

const mockUseWriteContract = {
  writeContract: vi.fn(),
  error: ref(null),
  isPending: ref(false),
  data: ref(null)
}

const mockUseWaitForTransactionReceipt = {
  isLoading: ref(false),
  isSuccess: ref(true),
  error: ref(null)
}
const mockUseSendTransaction = {
  isPending: ref(false),
  error: ref(false),
  data: ref<string>(''),
  sendTransaction: vi.fn()
}
const mockUseBalance = {
  data: ref<string | null>(null),
  isLoading: ref(false),
  error: ref(null),
  refetch: vi.fn()
}

// Mocking wagmi functions
vi.mock('@wagmi/vue', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    useReadContract: vi.fn(() => mockUseReadContract),
    useWriteContract: vi.fn(() => mockUseWriteContract),
    useWaitForTransactionReceipt: vi.fn(() => mockUseWaitForTransactionReceipt),
    useSendTransaction: vi.fn(() => mockUseSendTransaction),
    useBalance: vi.fn(() => mockUseBalance)
  }
})

describe('useAddAction', () => {
  const mockTeam = {
    id: '1',
    boardOfDirectorsAddress: '0x123' as `0x${string}`
  }

  const mockAction = {
    targetAddress: '0x456' as `0x${string}`,
    description: 'Test action',
    data: '0x789' as `0x${string}`
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock readContract response
    vi.mocked(readContract).mockResolvedValue(BigInt(1))

    // Mock the create action mutation
    vi.mocked(useCreateActionMutation).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      mutate: vi.fn(),
      isPending: ref(false),
      isError: ref(false),
      error: ref(null),
      data: ref(null),
      reset: vi.fn()
    } as unknown as ReturnType<typeof useCreateActionMutation>)
  })

  it('should handle errors during contract interaction', async () => {
    vi.mocked(readContract).mockRejectedValue(new Error('Contract error'))

    const { execute } = useAddAction()
    const consoleSpy = vi.spyOn(console, 'error')

    await execute(mockTeam, mockAction)

    expect(consoleSpy).toHaveBeenCalled()
  })
})
