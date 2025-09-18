import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBodWrites } from '../writes'
import { BOD_FUNCTION_NAMES } from '../types'

// Hoisted mock variables
const {
  mockUseContractWrites,
  mockUseQueryClient,
  mockUseAccount,
  mockTeamStore,
  mockQueryClient
} = vi.hoisted(() => {
  const mockQueryClient = {
    invalidateQueries: vi.fn()
  }

  return {
    mockUseContractWrites: vi.fn(),
    mockUseQueryClient: vi.fn(() => mockQueryClient),
    mockUseAccount: vi.fn(() => ({
      chainId: ref(1)
    })),
    mockTeamStore: {
      getContractAddressByType: vi.fn((type: string) => {
        if (type === 'BoardOfDirectors') return '0x1234567890123456789012345678901234567890'
        return undefined
      })
    },
    mockQueryClient
  }
})

// Mock external dependencies
vi.mock('@/composables/contracts/useContractWrites', () => ({
  useContractWrites: mockUseContractWrites
}))

vi.mock('@tanstack/vue-query', () => ({
  useQueryClient: mockUseQueryClient
}))

vi.mock('@wagmi/vue', () => ({
  useAccount: mockUseAccount
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore),
  useToastStore: vi.fn(() => ({
    addSuccessToast: vi.fn(),
    addErrorToast: vi.fn()
  }))
}))

vi.mock('@/artifacts/abi/bod.json', () => ({
  default: [
    { type: 'function', name: 'pause', inputs: [], outputs: [] },
    { type: 'function', name: 'unpause', inputs: [], outputs: [] }
  ]
}))

// Test constants
const MOCK_DATA = {
  bodAddress: '0x1234567890123456789012345678901234567890',
  chainId: 1,
  args: [] as readonly unknown[],
  value: BigInt(1)
} as const

const mockBaseWrites = {
  executeWrite: vi.fn(),
  estimateGas: vi.fn(),
  canExecuteTransaction: vi.fn(),
  invalidateQueries: vi.fn(),
  isLoading: ref(false),
  error: ref(null),
  isSuccess: ref(false)
}

describe('useBodWrites', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractWrites.mockReturnValue(mockBaseWrites)
    // ensure default address is present
    mockTeamStore.getContractAddressByType.mockImplementation((type: string) => {
      if (type === 'BoardOfDirectors') return MOCK_DATA.bodAddress
      return undefined
    })
  })

  describe('Initialization', () => {
    it('should initialize with correct contract configuration', () => {
      useBodWrites()

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: MOCK_DATA.bodAddress,
        abi: expect.any(Array),
        chainId: MOCK_DATA.chainId
      })
    })

    it('should get BOD address from team store', () => {
      useBodWrites()

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('BoardOfDirectors')
    })

    it('should get query client', () => {
      useBodWrites()

      expect(mockUseQueryClient).toHaveBeenCalled()
    })
  })

  describe('executeWrite', () => {
    it('should execute write with valid BOD function', async () => {
      const { executeWrite } = useBodWrites()

      await executeWrite(BOD_FUNCTION_NAMES.PAUSE, MOCK_DATA.args, MOCK_DATA.value, {})

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(
        BOD_FUNCTION_NAMES.PAUSE,
        MOCK_DATA.args,
        MOCK_DATA.value,
        {}
      )
    })

    it('should throw error for invalid BOD function', async () => {
      const { executeWrite } = useBodWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(executeWrite('invalidFunction' as any)).rejects.toThrow(
        'Invalid BOD function: invalidFunction'
      )
    })

    it('should work with a set of valid BOD functions', async () => {
      const { executeWrite } = useBodWrites()
      const validFunctions = [
        BOD_FUNCTION_NAMES.PAUSE,
        BOD_FUNCTION_NAMES.UNPAUSE,
        BOD_FUNCTION_NAMES.APPROVE,
        BOD_FUNCTION_NAMES.TRANSFER_OWNERSHIP,
        BOD_FUNCTION_NAMES.ADD_ACTION
      ]

      for (const fn of validFunctions) {
        await executeWrite(fn)
        expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(fn, [], undefined, undefined)
      }

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledTimes(validFunctions.length)
    })
  })

  describe('estimateGas', () => {
    it('should estimate gas with valid BOD function', async () => {
      const { estimateGas } = useBodWrites()

      await estimateGas(BOD_FUNCTION_NAMES.UNPAUSE, MOCK_DATA.args, MOCK_DATA.value)

      expect(mockBaseWrites.estimateGas).toHaveBeenCalledWith(
        BOD_FUNCTION_NAMES.UNPAUSE,
        MOCK_DATA.args,
        MOCK_DATA.value
      )
    })

    it('should throw error for invalid BOD function', async () => {
      const { estimateGas } = useBodWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(estimateGas('invalidFunction' as any)).rejects.toThrow(
        'Invalid BOD function: invalidFunction'
      )
    })
  })

  describe('canExecuteTransaction', () => {
    it('should check if transaction can execute with valid function', async () => {
      mockBaseWrites.canExecuteTransaction.mockResolvedValue(true)
      const { canExecuteTransaction } = useBodWrites()

      const result = await canExecuteTransaction(
        BOD_FUNCTION_NAMES.PAUSE,
        MOCK_DATA.args,
        MOCK_DATA.value
      )

      expect(mockBaseWrites.canExecuteTransaction).toHaveBeenCalledWith(
        BOD_FUNCTION_NAMES.PAUSE,
        MOCK_DATA.args,
        MOCK_DATA.value
      )
      expect(result).toBe(true)
    })

    it('should return false for invalid BOD function', async () => {
      const { canExecuteTransaction } = useBodWrites()

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await canExecuteTransaction('invalidFunction' as any)

      expect(result).toBe(false)
      expect(mockBaseWrites.canExecuteTransaction).not.toHaveBeenCalled()
    })
  })

  describe('invalidateBodQueries', () => {
    it('invalidates paused status after PAUSE', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.PAUSE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.PAUSED
          }
        ]
      })
    })

    it('invalidates paused status after UNPAUSE', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.UNPAUSE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.PAUSED
          }
        ]
      })
    })

    it('invalidates general readContract after ADD_ACTION (first case branch)', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.ADD_ACTION)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId
          }
        ]
      })
    })

    it('invalidates approval/executed status after TRANSFER_OWNERSHIP', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.TRANSFER_OWNERSHIP)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.IS_APPROVED
          }
        ]
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.IS_ACTION_EXECUTED
          }
        ]
      })
    })

    it('invalidates approval/executed status after APPROVE', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.APPROVE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.IS_APPROVED
          }
        ]
      })
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId,
            functionName: BOD_FUNCTION_NAMES.IS_ACTION_EXECUTED
          }
        ]
      })
    })

    it('invalidates general readContract for REVOKE (default branch)', async () => {
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.REVOKE)

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: [
          'readContract',
          {
            address: MOCK_DATA.bodAddress,
            chainId: MOCK_DATA.chainId
          }
        ]
      })
    })

    it('handles missing BOD address gracefully', async () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { invalidateBodQueries } = useBodWrites()

      await invalidateBodQueries(BOD_FUNCTION_NAMES.PAUSE)

      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled()
    })
  })

  describe('Return Interface', () => {
    it('should return all base functionality', () => {
      const bodWrites = useBodWrites()

      expect(bodWrites.isLoading).toBeDefined()
      expect(bodWrites.error).toBeDefined()
    })

    it('should return BOD-specific overrides', () => {
      const bodWrites = useBodWrites()

      expect(bodWrites).toHaveProperty('executeWrite')
      expect(bodWrites).toHaveProperty('estimateGas')
      expect(bodWrites).toHaveProperty('canExecuteTransaction')
      expect(bodWrites).toHaveProperty('invalidateBodQueries')
      expect(bodWrites).toHaveProperty('invalidateQueries')

      expect(typeof bodWrites.executeWrite).toBe('function')
      expect(typeof bodWrites.estimateGas).toBe('function')
      expect(typeof bodWrites.canExecuteTransaction).toBe('function')
      expect(typeof bodWrites.invalidateBodQueries).toBe('function')
      expect(typeof bodWrites.invalidateQueries).toBe('function')
    })

    it('should preserve generic invalidateQueries from base', () => {
      const bodWrites = useBodWrites()
      expect(bodWrites.invalidateQueries).toBe(mockBaseWrites.invalidateQueries)
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined chain ID', () => {
      mockUseAccount.mockReturnValue({ chainId: ref(null as unknown as number) })
      expect(() => useBodWrites()).not.toThrow()
    })

    it('should handle missing BOD address', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      expect(() => useBodWrites()).not.toThrow()
    })

    it('should work with default parameters', async () => {
      const { executeWrite } = useBodWrites()

      await executeWrite(BOD_FUNCTION_NAMES.PAUSE)

      expect(mockBaseWrites.executeWrite).toHaveBeenCalledWith(
        BOD_FUNCTION_NAMES.PAUSE,
        [],
        undefined,
        undefined
      )
    })
  })
})
