import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import {
  useElectionsCreateElection,
  useElectionsCastVote,
  useElectionsPublishResults
} from '../writes'
import type { Address } from 'viem'

// Hoisted mock variables
const { mockUseContractWrites, mockTeamStore } = vi.hoisted(() => ({
  mockUseContractWrites: vi.fn(),
  mockTeamStore: {
    getContractAddressByType: vi.fn()
  }
}))

// Mock external dependencies
vi.mock('@/composables/contracts/useContractWritesV2', () => ({
  useContractWrites: mockUseContractWrites
}))

vi.mock('@/stores', () => ({
  useTeamStore: vi.fn(() => mockTeamStore)
}))

// Test constants
const MOCK_DATA = {
  electionsAddress: '0x1234567890123456789012345678901234567890' as Address,
  candidateAddresses: [
    '0xA0b86a33E6441bB7bE6d0B9EB5Bbf26b2d60C1cd' as Address,
    '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address
  ],
  voterAddresses: [
    '0x9876543210987654321098765432109876543210' as Address,
    '0xABCDEF1234567890ABCDEF1234567890ABCDEF12' as Address
  ],
  electionId: BigInt(1),
  title: 'Board of Directors Election 2024',
  description: 'Annual election for board members',
  startDate: BigInt(Math.floor(Date.now() / 1000) + 86400), // Tomorrow
  endDate: BigInt(Math.floor(Date.now() / 1000) + 604800), // Next week
  seatCount: BigInt(3)
} as const

const mockContractWrite = {
  writeResult: { data: ref(null) },
  receiptResult: { data: ref(null) },
  simulateGasResult: { data: ref(null) },
  executeWrite: vi.fn(),
  invalidateQueries: vi.fn(),
  currentStep: ref('idle'),
  timelineSteps: ref([])
}

describe('Elections Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseContractWrites.mockReturnValue(mockContractWrite)
    mockTeamStore.getContractAddressByType.mockReturnValue(MOCK_DATA.electionsAddress)
  })

  describe('useElectionsCreateElection', () => {
    it('should call useContractWrites with correct parameters', () => {
      useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'createElection',
        args: expect.any(Object)
      })
    })

    it('should pass all election parameters in correct order', () => {
      useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value).toEqual([
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      ])
    })

    it('should work with reactive parameters', () => {
      const title = ref(MOCK_DATA.title)
      const description = ref(MOCK_DATA.description)
      const startDate = ref(MOCK_DATA.startDate)
      const endDate = ref(MOCK_DATA.endDate)
      const seatCount = ref(MOCK_DATA.seatCount)
      const candidates = ref(MOCK_DATA.candidateAddresses)
      const voters = ref(MOCK_DATA.voterAddresses)

      useElectionsCreateElection(
        title,
        description,
        startDate,
        endDate,
        seatCount,
        candidates,
        voters
      )

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'createElection',
        args: expect.any(Object)
      })
    })

    it('should update args when reactive parameters change', () => {
      const title = ref('Initial Title')
      const description = ref('Initial Description')

      useElectionsCreateElection(
        title,
        description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      // Change reactive values
      title.value = 'Updated Title'
      description.value = 'Updated Description'

      // Get the args computed ref
      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value[0]).toBe('Updated Title')
      expect(callArgs?.args.value[1]).toBe('Updated Description')
    })
  })

  describe('useElectionsCastVote', () => {
    it('should call useContractWrites with correct parameters', () => {
      useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'castVote',
        args: expect.any(Object)
      })
    })

    it('should pass election ID and candidate addresses', () => {
      useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value).toEqual([MOCK_DATA.electionId, MOCK_DATA.candidateAddresses])
    })

    it('should work with reactive election ID', () => {
      const electionId = ref(MOCK_DATA.electionId)
      const candidates = ref(MOCK_DATA.candidateAddresses)

      useElectionsCastVote(electionId, candidates)

      expect(mockUseContractWrites).toHaveBeenCalled()
    })

    it('should handle single candidate vote', () => {
      const singleCandidate = [MOCK_DATA.candidateAddresses[0]]

      useElectionsCastVote(MOCK_DATA.electionId, singleCandidate)

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value[1]).toEqual(singleCandidate)
    })

    it('should handle multiple candidate votes', () => {
      useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value[1]).toHaveLength(2)
    })
  })

  describe('useElectionsPublishResults', () => {
    it('should call useContractWrites with correct parameters', () => {
      useElectionsPublishResults(MOCK_DATA.electionId)

      expect(mockUseContractWrites).toHaveBeenCalledWith({
        contractAddress: expect.any(Object),
        abi: expect.any(Array),
        functionName: 'publishResults',
        args: expect.any(Object)
      })
    })

    it('should pass election ID as argument', () => {
      useElectionsPublishResults(MOCK_DATA.electionId)

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value).toEqual([MOCK_DATA.electionId])
    })

    it('should work with reactive election ID', () => {
      const electionId = ref(MOCK_DATA.electionId)

      useElectionsPublishResults(electionId)

      expect(mockUseContractWrites).toHaveBeenCalled()
    })

    it('should update args when reactive election ID changes', () => {
      const electionId = ref(BigInt(1))

      useElectionsPublishResults(electionId)

      // Change reactive value
      electionId.value = BigInt(2)

      const callArgs = mockUseContractWrites.mock.calls[0]?.[0]
      expect(callArgs?.args.value[0]).toBe(BigInt(2))
    })
  })

  describe('Elections contract address handling', () => {
    it('should get Elections contract address from team store', () => {
      useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Elections')
    })

    it('should use computed elections address across all write functions', () => {
      useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      useElectionsPublishResults(MOCK_DATA.electionId)

      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledTimes(3)
      expect(mockTeamStore.getContractAddressByType).toHaveBeenCalledWith('Elections')
    })
  })
})
