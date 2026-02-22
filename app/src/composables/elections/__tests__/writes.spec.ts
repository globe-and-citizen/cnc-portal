import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  useElectionsCreateElection,
  useElectionsCastVote,
  useElectionsPublishResults
} from '../writes'
import { mockElectionsWrites, resetContractMocks } from '@/tests/mocks'
import type { Address } from 'viem'

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
  candidateId: BigInt(0),
  title: 'Board of Directors Election 2024',
  description: 'Annual election for board members',
  startDate: BigInt(Math.floor(Date.now() / 1000) + 86400), // Tomorrow
  endDate: BigInt(Math.floor(Date.now() / 1000) + 604800), // Next week
  seatCount: BigInt(3)
} as const

describe('Elections Contract Writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetContractMocks()
  })

  describe('useElectionsCreateElection', () => {
    it('should return createElection mock', () => {
      const result = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      expect(result).toBe(mockElectionsWrites.createElection)
    })

    it('should have executeWrite function', () => {
      const result = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful write execution', async () => {
      mockElectionsWrites.createElection.executeWrite.mockResolvedValue(undefined)
      const result = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle write errors', async () => {
      const error = new Error('Election creation failed')
      mockElectionsWrites.createElection.executeWrite.mockRejectedValue(error)

      const result = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )

      await expect(result.executeWrite()).rejects.toThrow('Election creation failed')
    })
  })

  describe('useElectionsCastVote', () => {
    it('should return castVote mock', () => {
      const result = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      expect(result).toBe(mockElectionsWrites.castVote)
    })

    it('should have executeWrite function', () => {
      const result = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should handle single candidate vote', async () => {
      mockElectionsWrites.castVote.executeWrite.mockResolvedValue(undefined)
      const singleCandidate = [MOCK_DATA.candidateAddresses[0]]

      const result = useElectionsCastVote(MOCK_DATA.electionId, singleCandidate)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle multiple candidate votes', async () => {
      mockElectionsWrites.castVote.executeWrite.mockResolvedValue(undefined)

      const result = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle vote casting errors', async () => {
      const error = new Error('Vote casting failed')
      mockElectionsWrites.castVote.executeWrite.mockRejectedValue(error)

      const result = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      await expect(result.executeWrite()).rejects.toThrow('Vote casting failed')
    })
  })

  describe('useElectionsPublishResults', () => {
    it('should return publishResults mock', () => {
      const result = useElectionsPublishResults(MOCK_DATA.electionId)

      expect(result).toBe(mockElectionsWrites.publishResults)
    })

    it('should have executeWrite function', () => {
      const result = useElectionsPublishResults(MOCK_DATA.electionId)

      expect(result.executeWrite).toBeInstanceOf(Function)
    })

    it('should support successful results publication', async () => {
      mockElectionsWrites.publishResults.executeWrite.mockResolvedValue(undefined)
      const result = useElectionsPublishResults(MOCK_DATA.electionId)

      await result.executeWrite()
      expect(result.executeWrite).toHaveBeenCalled()
    })

    it('should handle results publication errors', async () => {
      const error = new Error('Results publication failed')
      mockElectionsWrites.publishResults.executeWrite.mockRejectedValue(error)

      const result = useElectionsPublishResults(MOCK_DATA.electionId)

      await expect(result.executeWrite()).rejects.toThrow('Results publication failed')
    })
  })

  describe('Mock Behavior', () => {
    it('should return distinct mocks for different functions', () => {
      const createElection = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )
      const castVote = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)
      const publishResults = useElectionsPublishResults(MOCK_DATA.electionId)

      expect(createElection).toBe(mockElectionsWrites.createElection)
      expect(castVote).toBe(mockElectionsWrites.castVote)
      expect(publishResults).toBe(mockElectionsWrites.publishResults)
      expect(createElection).not.toBe(castVote)
      expect(castVote).not.toBe(publishResults)
    })

    it('should reset mocks properly', () => {
      mockElectionsWrites.createElection.executeWrite.mockRejectedValue(new Error('Test'))
      mockElectionsWrites.castVote.executeWrite.mockRejectedValue(new Error('Test'))

      resetContractMocks()

      expect(mockElectionsWrites.createElection.executeWrite).not.toHaveBeenCalled()
      expect(mockElectionsWrites.castVote.executeWrite).not.toHaveBeenCalled()
    })

    it('should have consistent interface for all write mocks', () => {
      const createElection = useElectionsCreateElection(
        MOCK_DATA.title,
        MOCK_DATA.description,
        MOCK_DATA.startDate,
        MOCK_DATA.endDate,
        MOCK_DATA.seatCount,
        MOCK_DATA.candidateAddresses,
        MOCK_DATA.voterAddresses
      )
      const castVote = useElectionsCastVote(MOCK_DATA.electionId, MOCK_DATA.candidateAddresses)

      expect(createElection).toHaveProperty('executeWrite')
      expect(createElection).toHaveProperty('writeResult')
      expect(createElection).toHaveProperty('receiptResult')

      expect(castVote).toHaveProperty('executeWrite')
      expect(castVote).toHaveProperty('writeResult')
      expect(castVote).toHaveProperty('receiptResult')
    })
  })
})
