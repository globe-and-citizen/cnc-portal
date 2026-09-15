import { vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { mockElectionsReads, mockElectionsWrites } from '../mocks/contract.mock'

/**
 * Mock all Elections read composables.
 *
 * The address is driven by `mockElectionsReads.address` so a test can take it
 * away and exercise what the pages do before the team's contracts have landed.
 */
vi.mock('@/composables/elections/reads', () => ({
  useElectionsAddress: vi.fn(() =>
    computed(() => mockElectionsReads.address.data.value as Address | undefined)
  ),
  useElectionsOwner: vi.fn(() => mockElectionsReads.owner),
  useElectionsNextElectionId: vi.fn(() => mockElectionsReads.nextElectionId),
  useElectionsGetElection: vi.fn(() => mockElectionsReads.getElection),
  useElectionsGetVoteCount: vi.fn(() => mockElectionsReads.getVoteCount),
  useElectionsGetCandidateVoteCounts: vi.fn(() => mockElectionsReads.getCandidateVoteCounts),
  useElectionsGetCandidates: vi.fn(() => mockElectionsReads.getCandidates),
  useElectionsGetEligibleVoters: vi.fn(() => mockElectionsReads.getEligibleVoters),
  useElectionsGetWinners: vi.fn(() => mockElectionsReads.getWinners),
  useElectionsGetResults: vi.fn(() => mockElectionsReads.getResults),
  useElectionsHasVoted: vi.fn(() => mockElectionsReads.hasVoted),
  useElectionsGetVoterChoice: vi.fn(() => mockElectionsReads.getVoterChoice)
}))

vi.mock('@/composables/elections/writes', () => ({
  useElectionsCreateElection: vi.fn(() => mockElectionsWrites.createElection),
  useElectionsPublishResults: vi.fn(() => mockElectionsWrites.publishResults),
  useElectionsCastVote: vi.fn(() => mockElectionsWrites.castVote)
}))
