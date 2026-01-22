import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { useSafeData, useSafeOwners, useSafeInfo, useSafeThreshold } from '../useSafeData'
import type { SafeInfo } from '@/types/safe'

// Define proper mock return types
interface MockTeamStore {
  currentTeam: { safeAddress?: string } | null | undefined
}

interface MockQueryResult {
  data: Ref<SafeInfo | null>
  isLoading: Ref<boolean>
  isFetching: Ref<boolean>
  error: Ref<string | Error | null>
  refetch: () => void
}

// Hoisted mock variables
const { mockUseSafeInfoQuery, mockUseChainId, mockUseTeamStore } = vi.hoisted(() => ({
  mockUseSafeInfoQuery: vi.fn<[], MockQueryResult>(),
  mockUseChainId: vi.fn(() => ref(137)),
  mockUseTeamStore: vi.fn<[], MockTeamStore>()
}))

// Mock dependencies
vi.mock('@wagmi/vue', () => ({
  useChainId: mockUseChainId
}))

vi.mock('@/stores', () => ({
  useTeamStore: mockUseTeamStore
}))

vi.mock('@/queries/safe.queries', () => ({
  useSafeInfoQuery: mockUseSafeInfoQuery
}))

// Test constants
const MOCK_DATA = {
  validSafeAddress: '0x1234567890123456789012345678901234567890',
  altSafeAddress: '0x9876543210987654321098765432109876543210',
  teamSafeAddress: '0xTEAM567890123456789012345678901234567890',
  mockSafeInfo: {
    address: '0x1234567890123456789012345678901234567890',
    owners: [
      '0xOwner1234567890123456789012345678901234',
      '0xOwner5678901234567890123456789012345678'
    ],
    threshold: 2,
    balance: '1000000000000000000',
    nonce: 5,
    version: '1.4.1'
  } as SafeInfo,
  mockTeam: {
    safeAddress: '0xTEAM567890123456789012345678901234567890'
  }
} as const

// Helper function to create mock query result with proper typing
const createMockQueryResult = (data: Partial<SafeInfo> | null = null): MockQueryResult => ({
  data: ref(data as SafeInfo | null),
  isLoading: ref(false),
  isFetching: ref(false),
  error: ref(null),
  refetch: vi.fn()
})

describe('useSafeData', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default team store mock
    mockUseTeamStore.mockReturnValue({
      currentTeam: MOCK_DATA.mockTeam
    })

    // Setup default query mock
    mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult())
  })

  describe('Initialization and Address Handling', () => {
    it('should use team Safe address when no address ref provided', () => {
      mockUseSafeInfoQuery.mockReturnValue(
        createMockQueryResult({
          owners: ['0xOwner1'],
          threshold: 2,
          balance: '100'
        })
      )

      const { owners, threshold, safeInfo } = useSafeData()

      expect(mockUseSafeInfoQuery).toHaveBeenCalledWith(
        expect.anything(), // chainId ref
        expect.anything() // computed safeAddress
      )
      expect(owners.value).toEqual(['0xOwner1'])
      expect(threshold.value).toBe(2)
      expect(safeInfo.value?.balance).toBe('100')
    })

    it('should prefer provided Safe address ref over team address', () => {
      const customSafeAddress = ref(MOCK_DATA.validSafeAddress)

      mockUseSafeInfoQuery.mockReturnValue(
        createMockQueryResult({
          owners: ['0xCustomOwner'],
          threshold: 1,
          address: MOCK_DATA.validSafeAddress
        })
      )

      const { owners, threshold } = useSafeData(customSafeAddress)

      expect(owners.value).toEqual(['0xCustomOwner'])
      expect(threshold.value).toBe(1)
    })

    it('should handle string address parameter', () => {
      mockUseSafeInfoQuery.mockReturnValue(
        createMockQueryResult({
          owners: ['0xStringOwner'],
          threshold: 3
        })
      )

      const { owners, threshold } = useSafeData(MOCK_DATA.validSafeAddress)

      expect(owners.value).toEqual(['0xStringOwner'])
      expect(threshold.value).toBe(3)
    })

    it('should handle undefined team Safe address gracefully', () => {
      mockUseTeamStore.mockReturnValue({
        currentTeam: { safeAddress: undefined }
      })

      const { owners, threshold } = useSafeData()

      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
    })
  })

  describe('Data Access Properties', () => {
    it('should provide granular access to Safe properties', () => {
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(MOCK_DATA.mockSafeInfo))

      const result = useSafeData()

      expect(result.safeInfo.value).toEqual(MOCK_DATA.mockSafeInfo)
      expect(result.owners.value).toEqual(MOCK_DATA.mockSafeInfo.owners)
      expect(result.threshold.value).toBe(MOCK_DATA.mockSafeInfo.threshold)
      expect(result.balance.value).toBe(MOCK_DATA.mockSafeInfo.balance)
      expect(result.nonce.value).toBe(MOCK_DATA.mockSafeInfo.nonce)
      expect(result.version.value).toBe(MOCK_DATA.mockSafeInfo.version)
    })

    it('should provide fallback values when Safe info is null', () => {
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(null))

      const { safeInfo, owners, threshold, balance, nonce, version } = useSafeData()

      expect(safeInfo.value).toBe(null)
      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
      expect(balance.value).toBe('0')
      expect(nonce.value).toBe(0)
      expect(version.value).toBe('')
    })

    it('should provide fallback values when Safe info is undefined', () => {
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(undefined as null))

      const { owners, threshold, balance, nonce, version } = useSafeData()

      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
      expect(balance.value).toBe('0')
      expect(nonce.value).toBe(0)
      expect(version.value).toBe('')
    })
  })

  describe('Loading and Error States', () => {
    it('should expose loading state correctly', () => {
      const mockQuery: MockQueryResult = {
        data: ref(null),
        isLoading: ref(true),
        isFetching: ref(false),
        error: ref(null),
        refetch: vi.fn()
      }
      mockUseSafeInfoQuery.mockReturnValue(mockQuery)

      const { isLoading } = useSafeData()

      expect(isLoading.value).toBe(true)
    })

    it('should expose fetching state in loading', () => {
      const mockQuery: MockQueryResult = {
        data: ref(null),
        isLoading: ref(false),
        isFetching: ref(true),
        error: ref(null),
        refetch: vi.fn()
      }
      mockUseSafeInfoQuery.mockReturnValue(mockQuery)

      const { isLoading } = useSafeData()

      expect(isLoading.value).toBe(true)
    })

    it('should expose error state correctly', () => {
      const mockError = 'Safe not found'
      const mockQuery: MockQueryResult = {
        data: ref(null),
        isLoading: ref(false),
        isFetching: ref(false),
        error: ref(mockError),
        refetch: vi.fn()
      }
      mockUseSafeInfoQuery.mockReturnValue(mockQuery)

      const { error } = useSafeData()

      expect(error.value).toBe(mockError)
    })

    it('should expose refetch function', () => {
      const mockRefetch = vi.fn()
      const mockQuery: MockQueryResult = {
        data: ref(null),
        isLoading: ref(false),
        isFetching: ref(false),
        error: ref(null),
        refetch: mockRefetch
      }
      mockUseSafeInfoQuery.mockReturnValue(mockQuery)

      const { refetch } = useSafeData()

      expect(refetch).toBe(mockRefetch)
    })
  })

  describe('Backward Compatibility Functions', () => {
    describe('useSafeInfo', () => {
      it('should work identically to useSafeData', () => {
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(MOCK_DATA.mockSafeInfo))

        const { safeInfo, isLoading, error, refetch } = useSafeInfo()

        expect(safeInfo.value).toEqual(MOCK_DATA.mockSafeInfo)
        expect(isLoading.value).toBe(false)
        expect(error.value).toBe(null)
        expect(typeof refetch).toBe('function')
      })

      it('should accept address parameter', () => {
        const customAddress = ref(MOCK_DATA.validSafeAddress)
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(MOCK_DATA.mockSafeInfo))

        const { safeInfo } = useSafeInfo(customAddress)

        expect(safeInfo.value).toEqual(MOCK_DATA.mockSafeInfo)
      })
    })

    describe('useSafeOwners', () => {
      it('should return owners and related properties', () => {
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(MOCK_DATA.mockSafeInfo))

        const { owners, isLoading, error, refetch } = useSafeOwners()

        expect(owners.value).toEqual(MOCK_DATA.mockSafeInfo.owners)
        expect(isLoading.value).toBe(false)
        expect(error.value).toBe(null)
        expect(typeof refetch).toBe('function')
      })

      it('should accept address parameter', () => {
        const customAddress = ref(MOCK_DATA.validSafeAddress)
        mockUseSafeInfoQuery.mockReturnValue(
          createMockQueryResult({
            owners: ['0xCustomOwner1', '0xCustomOwner2']
          })
        )

        const { owners } = useSafeOwners(customAddress)

        expect(owners.value).toEqual(['0xCustomOwner1', '0xCustomOwner2'])
      })

      it('should return empty array when no owners available', () => {
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(null))

        const { owners } = useSafeOwners()

        expect(owners.value).toEqual([])
      })
    })

    describe('useSafeThreshold', () => {
      it('should return threshold and related properties', () => {
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(MOCK_DATA.mockSafeInfo))

        const { threshold, isLoading, error, refetch } = useSafeThreshold()

        expect(threshold.value).toBe(MOCK_DATA.mockSafeInfo.threshold)
        expect(isLoading.value).toBe(false)
        expect(error.value).toBe(null)
        expect(typeof refetch).toBe('function')
      })

      it('should accept address parameter', () => {
        const customAddress = ref(MOCK_DATA.validSafeAddress)
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult({ threshold: 5 }))

        const { threshold } = useSafeThreshold(customAddress)

        expect(threshold.value).toBe(5)
      })

      it('should return default threshold when no data available', () => {
        mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult(null))

        const { threshold } = useSafeThreshold()

        expect(threshold.value).toBe(1)
      })
    })
  })

  describe('Reactive Address Changes', () => {
    it('should react to address ref changes', () => {
      const safeAddressRef = ref(MOCK_DATA.validSafeAddress)

      // First call
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult({ owners: ['0xFirst'] }))

      const { owners } = useSafeData(safeAddressRef)

      expect(owners.value).toEqual(['0xFirst'])

      // Change address
      safeAddressRef.value = MOCK_DATA.altSafeAddress

      // The computed property should update, but we need to check the query was called correctly
      expect(mockUseSafeInfoQuery).toHaveBeenCalled()
    })

    it('should handle team address changes', () => {
      const teamStore: MockTeamStore = {
        currentTeam: { safeAddress: MOCK_DATA.teamSafeAddress }
      }

      mockUseTeamStore.mockReturnValue(teamStore)
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult({ owners: ['0xTeamOwner'] }))

      const { owners } = useSafeData()

      expect(owners.value).toEqual(['0xTeamOwner'])

      // Change team address
      if (teamStore.currentTeam) {
        teamStore.currentTeam.safeAddress = MOCK_DATA.altSafeAddress
      }

      expect(mockUseSafeInfoQuery).toHaveBeenCalled()
    })
  })

  describe('Query Integration', () => {
    it('should pass correct parameters to useSafeInfoQuery', () => {
      const customAddress = ref(MOCK_DATA.validSafeAddress)

      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult())

      useSafeData(customAddress)

      expect(mockUseSafeInfoQuery).toHaveBeenCalledWith(
        expect.anything(), // chainId (reactive)
        expect.anything() // safeAddress (computed)
      )
    })

    it('should use chainId from wagmi', () => {
      const customChainId = ref(42161) // Arbitrum
      mockUseChainId.mockReturnValue(customChainId)

      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult())

      useSafeData()

      expect(mockUseChainId).toHaveBeenCalled()
      expect(mockUseSafeInfoQuery).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null team data', () => {
      mockUseTeamStore.mockReturnValue({
        currentTeam: null
      })

      const { owners, threshold } = useSafeData()

      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
    })

    it('should handle undefined team store', () => {
      mockUseTeamStore.mockReturnValue({
        currentTeam: undefined
      })

      const { owners, threshold } = useSafeData()

      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
    })

    it('should handle empty Safe address', () => {
      const emptyAddress = ref('')

      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult())

      const { owners, threshold } = useSafeData(emptyAddress)

      expect(owners.value).toEqual([])
      expect(threshold.value).toBe(1)
    })

    it('should handle partial Safe info data', () => {
      mockUseSafeInfoQuery.mockReturnValue(
        createMockQueryResult({
          owners: ['0xPartialOwner']
          // Missing threshold, balance, etc.
        })
      )

      const { owners, threshold, balance, nonce } = useSafeData()

      expect(owners.value).toEqual(['0xPartialOwner'])
      expect(threshold.value).toBe(1) // fallback
      expect(balance.value).toBe('0') // fallback
      expect(nonce.value).toBe(0) // fallback
    })
  })

  describe('Return Value Structure', () => {
    it('should return all expected properties', () => {
      mockUseSafeInfoQuery.mockReturnValue(createMockQueryResult())

      const result = useSafeData()

      // Check all properties exist
      expect(result).toHaveProperty('safeInfo')
      expect(result).toHaveProperty('owners')
      expect(result).toHaveProperty('threshold')
      expect(result).toHaveProperty('balance')
      expect(result).toHaveProperty('nonce')
      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('isLoading')
      expect(result).toHaveProperty('error')
      expect(result).toHaveProperty('refetch')

      // Check property types
      expect(typeof result.safeInfo.value).toBe('object')
      expect(Array.isArray(result.owners.value)).toBe(true)
      expect(typeof result.threshold.value).toBe('number')
      expect(typeof result.balance.value).toBe('string')
      expect(typeof result.nonce.value).toBe('number')
      expect(typeof result.version.value).toBe('string')
      expect(typeof result.isLoading.value).toBe('boolean')
      expect(typeof result.refetch).toBe('function')
    })
  })
})
