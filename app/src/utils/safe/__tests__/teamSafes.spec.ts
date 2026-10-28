import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { TeamContract } from '@/types'
import { contractsInUse, defaultTeamSafe, teamSafes } from '../teamSafes'

const contract = (
  type: TeamContract['type'],
  address: string,
  activatedAt?: string,
  removedAt: string | null = null
): TeamContract => ({
  type,
  address: address as Address,
  deployer: '0x0000000000000000000000000000000000000001',
  admins: [],
  activatedAt,
  removedAt
})

const BANK = contract('Bank', '0x1111111111111111111111111111111111111111')
const OLD_SAFE = contract(
  'Safe',
  '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '2026-01-01T00:00:00Z'
)
const DEFAULT_SAFE = contract(
  'Safe',
  '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  '2026-06-01T00:00:00Z'
)
const REMOVED_SAFE = contract(
  'Safe',
  '0xcccccccccccccccccccccccccccccccccccccccc',
  '2026-09-01T00:00:00Z',
  '2026-10-01T00:00:00Z'
)
const CONTRACTS = [OLD_SAFE, BANK, REMOVED_SAFE, DEFAULT_SAFE]

describe('[US-SAFE-001] teamSafes', () => {
  it('[AC-US-SAFE-001-15] lists every Safe, removed ones included, latest activated first', () => {
    expect(teamSafes(CONTRACTS)).toEqual([REMOVED_SAFE, DEFAULT_SAFE, OLD_SAFE])
    expect(teamSafes(undefined)).toEqual([])
  })

  it('[AC-US-SAFE-001-17] picks the latest activated Safe that is not removed as the default', () => {
    expect(defaultTeamSafe(CONTRACTS)).toBe(DEFAULT_SAFE)
    expect(defaultTeamSafe([BANK, REMOVED_SAFE])).toBeUndefined()
  })

  it('keeps the contracts in use: every other contract and the default Safe only', () => {
    expect(contractsInUse(CONTRACTS)).toEqual([BANK, DEFAULT_SAFE])
    expect(contractsInUse([BANK, REMOVED_SAFE])).toEqual([BANK])
  })
})
