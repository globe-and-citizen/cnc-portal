import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed } from 'vue'
import type { Address } from 'viem'
import { useBoDElections } from '../index'
import { mockElectionsReads, resetContractMocks } from '@/tests/mocks'
import type { RawElection } from '@/utils/elections/election'

const OWNER = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address

function rawElection(startDate: number, endDate: number, resultsPublished = false): RawElection {
  return [
    4n,
    'Board 2027',
    'Elect the next board',
    OWNER,
    BigInt(startDate),
    BigInt(endDate),
    3n,
    resultsPublished
  ]
}

describe('useBoDElections', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'))
    resetContractMocks()
    mockElectionsReads.getEligibleVoters.data.value = [
      OWNER,
      '0x0000000000000000000000000000000000000002'
    ]
    mockElectionsReads.getVoteCount.data.value = 0n
    mockElectionsReads.getCandidates.data.value = [OWNER]
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Covers:
   * - [AC-US-EL-05-01]
   * - [AC-US-EL-05-04]
   * - [AC-US-EL-05-05]
   */
  it('derives upcoming, active, and completed states independently from publication', () => {
    const now = Math.floor(Date.now() / 1_000)
    mockElectionsReads.getElection.data.value = rawElection(now + 60, now + 180)
    const election = useBoDElections(computed(() => 4n))

    expect(election.electionStatus.value?.text).toBe('Upcoming')
    vi.advanceTimersByTime(61_000)
    expect(election.electionStatus.value?.text).toBe('Active')

    mockElectionsReads.getVoteCount.data.value = 2n
    expect(election.electionStatus.value?.text).toBe('Completed')
    expect(election.formattedElection.value?.resultsPublished).toBe(false)
  })

  it('[AC-US-EL-05-06] exposes no valid status while election data is unavailable', () => {
    mockElectionsReads.getElection.data.value = undefined

    const election = useBoDElections(computed(() => 4n))

    expect(election.formattedElection.value).toBeNull()
    expect(election.electionStatus.value).toBeNull()
    expect(election.leftToStart.value).toBe(0)
    expect(election.leftToEnd.value).toBe(0)
  })
})
