// bod-read.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useBodOwner,
  useBodIsActionExecuted,
  useBodIsApproved,
  useBodGetBoardOfDirectors,
  useBodIsMember,
  useBodApprovalCount,
  useBodIsBodAction
} from '../reads'
import type { Abi, Address } from 'viem'

//  Hoisted mock variables
const { mockUseReadContract, mockTeamStore, mockUserDataStore, mockIsAddress } = vi.hoisted(() => ({
  mockUseReadContract: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn().mockReturnValue('0xB0D0000000000000000000000000000000000000')
  },
  mockUserDataStore: {
    address: '0xU53R000000000000000000000000000000000000'
  },
  mockIsAddress: vi.fn((address: string) => /^0x[a-fA-F0-9]{40}$/.test(address))
}))

// External dependency mocks
vi.mock('@wagmi/vue', () => ({
  useReadContract: mockUseReadContract
}))

vi.mock('@/stores', () => ({
  useTeamStore: () => mockTeamStore,
  useUserDataStore: () => mockUserDataStore
}))

vi.mock('viem', async (importOriginal) => {
  const actual: object = await importOriginal()
  return {
    ...actual,
    isAddress: mockIsAddress
  }
})

//  Test constants
const MOCK = {
  validBodAddress: '0xB0D0000000000000000000000000000000000000' as Address,
  otherContractAddress: '0x0TH3R0000000000000000000000000000000000' as Address,
  validMemberAddress: '0xM3MB300000000000000000000000000000000000' as Address,
  invalidAddress: 'not-an-address',
  actionId: 42
} as const

// Dummy ABI for testing
const DUMMY_ABI: Abi = [
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'address', name: 'owner' }]
  }
]

describe('BOD Read Composables', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTeamStore.getContractAddressByType.mockImplementation((type: string) => {
      if (type === 'BoardOfDirectors') return MOCK.validBodAddress
      return undefined
    })

    mockUseReadContract.mockReturnValue({
      data: ref(undefined),
      isLoading: ref(false),
      error: ref(null),
      isSuccess: ref(false)
    })
  })

  // BOD Owner tests
  describe('useBodOwner', () => {
    it('reads the BOD owner', () => {
      const result = useBodOwner(MOCK.otherContractAddress)

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('enables query when address is valid', () => {
      useBodOwner(MOCK.validBodAddress)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(true)
    })

    it('disables query when address is invalid', () => {
      useBodOwner(undefined as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[0]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(false)
    })
  })

  // BOD Action Execution tests
  describe('useBodIsActionExecuted', () => {
    it('checks if an action has been executed', () => {
      const result = useBodIsActionExecuted(MOCK.actionId)

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('passes the action ID as argument', () => {
      useBodIsActionExecuted(42)

      const callArgs = mockUseReadContract.mock.calls[mockUseReadContract.mock.calls.length - 1]?.[0]
      expect(callArgs?.args).toBeDefined()
    })
  })

  // BOD Approval tests
  describe('useBodIsApproved', () => {
    it('checks if a member has approved an action', () => {
      const result = useBodIsApproved(MOCK.actionId, MOCK.validMemberAddress)

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('enables query when both actionId and memberAddress are valid', () => {
      useBodIsApproved(MOCK.actionId, MOCK.validMemberAddress)

      const callArgs = mockUseReadContract.mock.calls[mockUseReadContract.mock.calls.length - 1]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(true)
    })

    it('disables query when memberAddress is invalid', () => {
      useBodIsApproved(MOCK.actionId, MOCK.invalidAddress as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[mockUseReadContract.mock.calls.length - 1]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(false)
    })
  })

  // BOD Board Of Directors tests
  describe('useBodGetBoardOfDirectors', () => {
    it('retrieves the board of directors', () => {
      const result = useBodGetBoardOfDirectors()

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('uses the BOD address from team store', () => {
      mockTeamStore.getContractAddressByType.mockClear()
      useBodGetBoardOfDirectors()

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('BoardOfDirectors')
    })
  })

  // BOD Member tests
  describe('useBodIsMember', () => {
    it('checks if an address is a BOD member', () => {
      const result = useBodIsMember(MOCK.validMemberAddress)

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('enables query when address is valid', () => {
      useBodIsMember(MOCK.validMemberAddress)

      const callArgs = mockUseReadContract.mock.calls[mockUseReadContract.mock.calls.length - 1]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(true)
    })

    it('disables query when address is invalid', () => {
      useBodIsMember(MOCK.invalidAddress as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[mockUseReadContract.mock.calls.length - 1]?.[0]
      expect(callArgs?.query?.enabled?.value ?? callArgs?.query?.enabled).toBe(false)
    })
  })

  // BOD Approval Count tests
  describe('useBodApprovalCount', () => {
    it('retrieves the approval count for an action', () => {
      const result = useBodApprovalCount()

      expect(mockUseReadContract).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('uses the BOD address from team store', () => {
      mockTeamStore.getContractAddressByType.mockClear()
      useBodApprovalCount()

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('BoardOfDirectors')
    })
  })
})
