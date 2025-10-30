// bod-read.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useBodReads } from '../reads'
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

describe('useBodReads', () => {
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

  // Address management
  describe('BOD Address Management', () => {
    it('gets the BOD address from the team store', () => {
      mockTeamStore.getContractAddressByType.mockClear()
      const { bodAddress } = useBodReads()

      const result = bodAddress.value

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('BoardOfDirectors')
      expect(result).toBe(MOCK.validBodAddress)
    })

    it('validates BOD address', () => {
      const { isBodAddressValid } = useBodReads()
      expect(isBodAddressValid.value).toBe(true)
    })

    it('handles undefined BOD address', () => {
      mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
      const { isBodAddressValid } = useBodReads()
      expect(isBodAddressValid.value).toBe(false)
    })
  })

  // ─── Read functions
  describe('BOD Read Functions', () => {
    // it('calls useBodPaused with correct params', () => {
    //   const { useBodPaused } = useBodReads()
    //   useBodPaused()

    //   expect(mockUseReadContract).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       address: MOCK.validBodAddress,
    //       abi: expect.any(Array),
    //       functionName: 'paused',
    //       query: expect.objectContaining({
    //         enabled: expect.any(Object)
    //       })
    //     })
    //   )
    // })

    it('calls useBodOwner with provided address/abi and BOD-enabled query', () => {
      const { useBodOwner } = useBodReads()
      useBodOwner(MOCK.otherContractAddress, DUMMY_ABI)

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.otherContractAddress,
          abi: DUMMY_ABI,
          functionName: 'owner',
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it.skip('calls useBodIsActionExecuted with correct params', () => {
      const { useBodIsActionExecuted } = useBodReads()
      useBodIsActionExecuted(MOCK.actionId)

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.validBodAddress,
          abi: expect.any(Array),
          functionName: 'isActionExecuted',
          args: [MOCK.actionId],
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it.skip('calls useBodIsApproved with correct params', () => {
      const { useBodIsApproved } = useBodReads()
      useBodIsApproved(MOCK.actionId, MOCK.validMemberAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.validBodAddress,
          abi: expect.any(Array),
          functionName: 'isApproved',
          args: [MOCK.actionId, MOCK.validMemberAddress],
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it('calls useBodGetBoardOfDirectors with correct params', () => {
      const { useBodGetBoardOfDirectors } = useBodReads()
      useBodGetBoardOfDirectors()

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.validBodAddress,
          abi: expect.any(Array),
          functionName: 'getBoardOfDirectors',
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it('calls useBodIsMember with correct params', () => {
      const { useBodIsMember } = useBodReads()
      useBodIsMember(MOCK.validMemberAddress)

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.validBodAddress,
          abi: expect.any(Array),
          functionName: 'isMember',
          args: [MOCK.validMemberAddress],
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })

    it('calls useBodApprovalCount with correct params', () => {
      const { useBodApprovalCount } = useBodReads()
      useBodApprovalCount()

      expect(mockUseReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          address: MOCK.validBodAddress,
          abi: expect.any(Array),
          functionName: 'approvalCount',
          query: expect.objectContaining({
            enabled: expect.any(Object)
          })
        })
      )
    })
  })

  //  Query enablement
  describe('Query Enablement Logic', () => {
    // it('disables queries when BOD address is invalid', () => {
    //   mockTeamStore.getContractAddressByType.mockReturnValue(undefined)
    //   // useBodPaused is not a bod function, this is why i comment the test
    //   const { useBodPaused, isBodAddressValid } = useBodReads()
    //   useBodPaused()

    //   expect(isBodAddressValid.value).toBe(false)
    //   const callArgs = mockUseReadContract.mock.calls[0][0]
    //   expect(callArgs.query.enabled.value).toBe(false)
    // })

    it.skip('disables isApproved when member address invalid', () => {
      const { useBodIsApproved } = useBodReads()
      useBodIsApproved(MOCK.actionId, MOCK.invalidAddress as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })

    it.skip('disables isMember when member address invalid', () => {
      const { useBodIsMember } = useBodReads()
      useBodIsMember(MOCK.invalidAddress as unknown as Address)

      const callArgs = mockUseReadContract.mock.calls[0][0]
      expect(callArgs.query.enabled.value).toBe(false)
    })
  })

  // ─── useBodIsBodAction helper
  describe('useBodIsBodAction', () => {
    it.skip('computes true when owner is BOD and user is a BOD member', () => {
      mockUseReadContract
        .mockReturnValueOnce({
          data: ref(true),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })
        .mockReturnValueOnce({
          data: ref(MOCK.validBodAddress),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })

      const { useBodIsBodAction } = useBodReads()
      const { isBodAction } = useBodIsBodAction(MOCK.otherContractAddress, DUMMY_ABI)

      expect(isBodAction.value).toBe(true)
    })

    it('computes false when owner is not BOD', () => {
      mockUseReadContract
        .mockReturnValueOnce({
          data: ref(true),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })
        .mockReturnValueOnce({
          data: ref('0xDEAD000000000000000000000000000000000000'),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })

      const { useBodIsBodAction } = useBodReads()
      const { isBodAction } = useBodIsBodAction(MOCK.otherContractAddress, DUMMY_ABI)

      expect(isBodAction.value).toBe(false)
    })

    it('computes false when user is not a BOD member', () => {
      mockUseReadContract
        .mockReturnValueOnce({
          data: ref(false),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })
        .mockReturnValueOnce({
          data: ref(MOCK.validBodAddress),
          isLoading: ref(false),
          error: ref(null),
          isSuccess: ref(true)
        })

      const { useBodIsBodAction } = useBodReads()
      const { isBodAction } = useBodIsBodAction(MOCK.otherContractAddress, DUMMY_ABI)

      expect(isBodAction.value).toBe(false)
    })
  })

  // ─── Return interface
  describe('Return Interface', () => {
    it('exposes all expected properties and methods', () => {
      const bodReads = useBodReads()

      expect(bodReads).toHaveProperty('bodAddress')
      expect(bodReads).toHaveProperty('isBodAddressValid')
      expect(bodReads).toHaveProperty('boardOfDirectors')
      expect(bodReads).toHaveProperty('useBodIsBodAction')
      // expect(bodReads).toHaveProperty('useBodPaused')
      expect(bodReads).toHaveProperty('useBodOwner')
      expect(bodReads).toHaveProperty('useBodIsActionExecuted')
      expect(bodReads).toHaveProperty('useBodIsApproved')
      expect(bodReads).toHaveProperty('useBodGetBoardOfDirectors')
      expect(bodReads).toHaveProperty('useBodIsMember')
      expect(bodReads).toHaveProperty('useBodApprovalCount')
    })
  })
})
