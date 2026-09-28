import { describe, expect, it, vi } from 'vitest'
import { zeroHash, type Address } from 'viem'
import type { ChainClient } from '@/composables/eventsViaLogs'
import { fetchInvestorPermissions, MINTER_ROLE } from '@/queries/investorPermissions.queries'

const investor = '0x1000000000000000000000000000000000000000' as Address
const owner = '0x2000000000000000000000000000000000000000' as Address
const knownMinter = '0x3000000000000000000000000000000000000000' as Address
const eventMinter = '0x4000000000000000000000000000000000000000' as Address

function makeClient(options?: { rejectedEvents?: string[]; ownerReadFails?: boolean }) {
  const roles = new Map([
    [`${zeroHash}:${owner}`.toLowerCase(), true],
    [`${String(MINTER_ROLE)}:${owner}`.toLowerCase(), true],
    [`${String(MINTER_ROLE)}:${knownMinter}`.toLowerCase(), true],
    [`${String(MINTER_ROLE)}:${eventMinter}`.toLowerCase(), true]
  ])

  return {
    readContract: vi.fn(async ({ functionName, args }) => {
      if (functionName === 'owner') {
        if (options?.ownerReadFails) throw new Error('owner unavailable')
        return owner
      }
      const [role, account] = args as [string, Address]
      return roles.get(`${String(role)}:${account}`.toLowerCase()) ?? false
    }),
    getLogs: vi.fn(async ({ event }) => {
      if (options?.rejectedEvents?.includes(event.name)) throw new Error('logs unavailable')
      if (event.name === 'RoleGranted') return [{ args: { account: eventMinter } }]
      return []
    })
  } as unknown as ChainClient
}

describe('fetchInvestorPermissions', () => {
  it('[AC-US-SHER-009-01] discovers event-only holders and verifies current roles', async () => {
    const result = await fetchInvestorPermissions(makeClient(), investor, [owner, knownMinter])

    expect(result.evidence).toBe('complete')
    expect(result.accounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ address: owner, isOwner: true, isAdmin: true, isMinter: true }),
        expect.objectContaining({ address: knownMinter, isMinter: true }),
        expect.objectContaining({ address: eventMinter, isMinter: true })
      ])
    )
  })

  it('[AC-US-SHER-009-02] marks a partial event scan instead of presenting it as complete', async () => {
    const result = await fetchInvestorPermissions(
      makeClient({ rejectedEvents: ['RoleRevoked'] }),
      investor,
      [knownMinter]
    )

    expect(result.evidence).toBe('partial')
    expect(result.gaps).toContain('RoleRevoked history could not be scanned.')
    expect(result.accounts).toContainEqual(expect.objectContaining({ address: knownMinter }))
  })

  it('[AC-US-SHER-009-02] keeps verified known holders when historical logs are unavailable', async () => {
    const result = await fetchInvestorPermissions(
      makeClient({ rejectedEvents: ['RoleGranted', 'RoleRevoked'] }),
      investor,
      [knownMinter]
    )

    expect(result.evidence).toBe('unavailable')
    expect(result.accounts).toContainEqual(
      expect.objectContaining({ address: knownMinter, isMinter: true })
    )
  })

  it('reports unavailable evidence when current ownership cannot be read', async () => {
    const result = await fetchInvestorPermissions(
      makeClient({ ownerReadFails: true }),
      investor,
      []
    )

    expect(result).toEqual({
      accounts: [],
      evidence: 'unavailable',
      gaps: ['Investor ownership could not be read.']
    })
  })
})
