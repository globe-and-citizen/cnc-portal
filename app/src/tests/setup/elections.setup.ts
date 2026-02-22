import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockElectionsReads, mockElectionsWrites } from '../mocks/contract.mock'

const MOCK_ELECTIONS_ADDRESS = '0x1234567890123456789012345678901234567890' as Address

/**
 * Mock all Elections read composables
 */
vi.mock('@/composables/elections/reads', () => ({
  useElectionsAddress: vi.fn(() => computed(() => MOCK_ELECTIONS_ADDRESS)),
  useElectionsOwner: vi.fn(() => mockElectionsReads.owner),
  useElectionsGetElection: vi.fn(() => mockElectionsReads.getElection),
  useElectionsGetVoteCount: vi.fn(() => mockElectionsReads.getVoteCount),
  useElectionsGetCandidates: vi.fn(() => mockElectionsReads.getCandidates),
  useElectionsGetEligibleVoters: vi.fn(() => mockElectionsReads.getEligibleVoters),
  useElectionsGetWinners: vi.fn(() => mockElectionsReads.getWinners),
  useElectionsHasVoted: vi.fn(() => mockElectionsReads.hasVoted)
}))

/**
 * Mock all Elections write composables
 */
vi.mock('@/composables/elections/writes', () => ({
  useElectionsCreateElection: vi.fn(() => mockElectionsWrites.createElection),
  useElectionsCastVote: vi.fn(() => mockElectionsWrites.castVote),
  useElectionsPublishResults: vi.fn(() => mockElectionsWrites.publishResults)
}))

