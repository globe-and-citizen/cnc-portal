import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { parseElectionId, toElection, type RawElection } from '../election'

const CREATOR = '0x742d35Cc6bF8C55C6C2e013e5492D2b6637e0886' as Address

const raw: RawElection = [
  3n,
  'Board 2026',
  'Seats the next board',
  CREATOR,
  1_700_000_000n,
  1_700_086_400n,
  3n,
  true
]

describe('toElection', () => {
  it('reads every field the contract returns', () => {
    expect(toElection(raw)).toEqual({
      id: 3,
      title: 'Board 2026',
      description: 'Seats the next board',
      createdBy: CREATOR,
      startDate: new Date(1_700_000_000_000),
      endDate: new Date(1_700_086_400_000),
      seatCount: 3,
      resultsPublished: true
    })
  })

  it('returns null while the read has not landed', () => {
    expect(toElection(undefined)).toBeNull()
  })
})

describe('parseElectionId', () => {
  it('reads a whole number from the URL', () => {
    expect(parseElectionId('12')).toBe(12n)
  })

  it.each([
    ['a missing value', undefined],
    ['a non-string', 7],
    ['several values', ['1', '2']],
    ['text', 'latest'],
    ['a negative id', '-1'],
    ['a decimal', '1.5'],
    ['id zero, which no election has', '0']
  ])('treats %s as absent', (_case, value) => {
    expect(parseElectionId(value)).toBeNull()
  })
})
