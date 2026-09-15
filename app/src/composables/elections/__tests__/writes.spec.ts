import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { contractReadsOfAddress } from '@/composables/contracts/useContractWritesV3'
import { electionVoteReadsOfAddress } from '../invalidation'

const ELECTIONS = '0x1234567890123456789012345678901234567890' as Address
const BOARD = '0xAbCdEf0123456789AbCdEf0123456789AbCdEf01' as Address

/**
 * `useElectionsPublishResults` refreshes the Board of Directors through this
 * predicate: publication seats the winners on a contract the write's own
 * address-scoped invalidation cannot reach.
 *
 * The tests match it against the key shape `useReadContract` actually stores.
 * Asserting only that `invalidateQueries` was called cannot catch a key that
 * matches no query — which is how the gap this closes shipped in the first place.
 */
describe('contractReadsOfAddress', () => {
  const readKey = (address: Address, functionName: string, chainId = 31337) => [
    'readContract',
    { address, functionName, chainId, args: [] }
  ]

  it('matches every read of the given contract', () => {
    const matches = contractReadsOfAddress(BOARD)

    expect(matches({ queryKey: readKey(BOARD, 'getBoardOfDirectors') })).toBe(true)
    expect(matches({ queryKey: readKey(BOARD, 'isMember') })).toBe(true)
  })

  it('leaves reads of other contracts alone', () => {
    const matches = contractReadsOfAddress(BOARD)

    expect(matches({ queryKey: readKey(ELECTIONS, 'getElection') })).toBe(false)
  })

  it('matches regardless of address casing', () => {
    const matches = contractReadsOfAddress(BOARD.toLowerCase() as Address)

    expect(matches({ queryKey: readKey(BOARD, 'getBoardOfDirectors') })).toBe(true)
  })

  it('ignores keys from other namespaces', () => {
    const matches = contractReadsOfAddress(BOARD)

    expect(matches({ queryKey: ['pastElections', BOARD] })).toBe(false)
    expect(matches({ queryKey: ['balance', { address: BOARD }] })).toBe(false)
  })

  it('narrows to one chain only when the caller pins it', () => {
    const pinned = contractReadsOfAddress(BOARD, 31337)

    expect(pinned({ queryKey: readKey(BOARD, 'isMember', 137) })).toBe(false)
    expect(pinned({ queryKey: readKey(BOARD, 'isMember', 31337) })).toBe(true)
    expect(contractReadsOfAddress(BOARD)({ queryKey: readKey(BOARD, 'isMember', 137) })).toBe(true)
  })
})

describe('electionVoteReadsOfAddress', () => {
  const readKey = (functionName: string) => [
    'readContract',
    { address: ELECTIONS, functionName, chainId: 31337, args: [] }
  ]

  const groupedCountKey = [
    'electionCandidateVoteCounts',
    { address: ELECTIONS, electionId: '4', candidates: [BOARD] }
  ] as const

  it('refreshes the ballot reads a vote changes', () => {
    const matches = electionVoteReadsOfAddress(ELECTIONS)

    expect(matches({ queryKey: readKey('getVoteCount') })).toBe(true)
    expect(matches({ queryKey: readKey('hasVoted') })).toBe(true)
    expect(matches({ queryKey: readKey('getVoterChoice') })).toBe(true)
    expect(matches({ queryKey: readKey('getElectionResults') })).toBe(true)
    expect(matches({ queryKey: groupedCountKey })).toBe(true)
  })

  it('does not re-fetch the immutable election record after a vote', () => {
    const matches = electionVoteReadsOfAddress(ELECTIONS)

    expect(matches({ queryKey: readKey('getElection') })).toBe(false)
    expect(matches({ queryKey: ['pastElections'] })).toBe(false)
  })

  it('does not invalidate another Elections contract', () => {
    const matches = electionVoteReadsOfAddress(ELECTIONS)

    expect(
      matches({
        queryKey: [
          'electionCandidateVoteCounts',
          { address: BOARD, electionId: '4', candidates: [BOARD] }
        ]
      })
    ).toBe(false)
  })
})
