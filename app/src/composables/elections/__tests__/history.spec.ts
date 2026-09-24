import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useQueryFn } from '@/tests/mocks/composables.mock'
import { mockElectionsReads, mockWagmiCore } from '@/tests/mocks'

vi.unmock('@/composables/elections/history')

import { useElectionsPastElections } from '../history'

type CapturedQuery = {
  queryKey: unknown
  enabled: { value: boolean }
  queryFn: () => Promise<unknown>
}

const ELECTIONS = '0x1234567890123456789012345678901234567890'

function rawElection(id: number, resultsPublished: boolean) {
  return [
    BigInt(id),
    `Election ${id}`,
    '',
    '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886',
    1_700_000_000n,
    1_700_086_400n,
    2n,
    resultsPublished
  ] as const
}

describe('useElectionsPastElections', () => {
  let capturedQuery: CapturedQuery | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    capturedQuery = null
    mockElectionsReads.address.data.value = ELECTIONS
    useQueryFn.mockImplementation((options: unknown) => {
      capturedQuery = options as CapturedQuery
      return { data: ref(undefined), isLoading: ref(false), error: ref(null), refetch: vi.fn() }
    })
  })

  function getQuery(): CapturedQuery {
    if (!capturedQuery) throw new Error('Expected the past elections query to be registered')
    return capturedQuery
  }

  it('keys the list on the pastElections name the publish write invalidates', () => {
    useElectionsPastElections()

    const [name] = getQuery().queryKey as unknown[]
    expect(name).toBe('pastElections')
  })

  it('waits for the Elections contract before reading', () => {
    mockElectionsReads.address.data.value = undefined

    useElectionsPastElections()

    expect(getQuery().enabled.value).toBe(false)
  })

  it('returns an empty list when the team has never run an election', async () => {
    mockWagmiCore.readContract.mockResolvedValueOnce([])

    useElectionsPastElections()

    await expect(getQuery().queryFn()).resolves.toEqual([])
    expect(mockWagmiCore.readContract).toHaveBeenCalledTimes(1)
  })

  it('[AC-US-EL-08-03] keeps only published elections in the history', async () => {
    const ids = [1n, 2n, 3n, 4n, 5n, 6n, 7n]
    mockWagmiCore.readContract.mockResolvedValueOnce(ids)
    ids.forEach((id) =>
      mockWagmiCore.readContract.mockResolvedValueOnce(rawElection(Number(id), id !== 7n))
    )

    useElectionsPastElections()

    const elections = (await getQuery().queryFn()) as { id: number; resultsPublished: boolean }[]
    expect(elections.map((election) => election.id)).toEqual([6, 5, 4, 3, 2, 1])
    expect(elections.every((election) => election.resultsPublished)).toBe(true)
  })

  it('skips an election whose read fails rather than dropping the whole list', async () => {
    mockWagmiCore.readContract
      .mockResolvedValueOnce([1n, 2n])
      .mockResolvedValueOnce(rawElection(1, true))
      .mockRejectedValueOnce(new Error('rpc'))

    useElectionsPastElections()

    const elections = (await getQuery().queryFn()) as { id: number }[]
    expect(elections.map((election) => election.id)).toEqual([1])
  })
})
