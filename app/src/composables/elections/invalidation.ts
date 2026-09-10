import type { Address } from 'viem'

/**
 * The keys whose values change when a ballot is cast. `getElection` is not in
 * this set: the election's title, dates and configuration are immutable, so a
 * vote must not re-fetch the page just to refresh the ballot.
 */
const ELECTION_VOTE_READS = new Set([
  'getVoteCount',
  'getVoteCounts',
  'getElectionResults',
  'hasVoted',
  'getVoterChoice'
])

/**
 * Matches only the election reads a successful vote makes stale, including the
 * one grouped candidate-count query. It deliberately excludes `getElection`.
 */
export function electionVoteReadsOfAddress(address: Address) {
  const addressLower = address.toLowerCase()

  return (query: { queryKey: readonly unknown[] }) => {
    const key = query.queryKey
    if (!Array.isArray(key)) return false

    const params = key[1] as { address?: string; functionName?: string } | undefined
    if (key[0] === 'readContract') {
      return (
        !!params &&
        typeof params.address === 'string' &&
        params.address.toLowerCase() === addressLower &&
        typeof params.functionName === 'string' &&
        ELECTION_VOTE_READS.has(params.functionName)
      )
    }

    return (
      key[0] === 'electionCandidateVoteCounts' &&
      !!params &&
      typeof params.address === 'string' &&
      params.address.toLowerCase() === addressLower
    )
  }
}
