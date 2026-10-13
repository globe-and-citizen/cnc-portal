import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { Team } from '@/types'
import { buildTeamTreasuryDisplay, getTeamTreasuryAddresses } from '@/utils/teams/treasury'

const BANK = '0x1111111111111111111111111111111111111111' as Address
const SAFE = '0x2222222222222222222222222222222222222222' as Address

const makeTeam = (overrides: Partial<Team> = {}): Team =>
  ({
    id: '1',
    name: 'Company A',
    slug: 'company-a',
    description: '',
    isHidden: false,
    isArchived: false,
    members: [],
    ownerAddress: BANK,
    teamContracts: [
      { type: 'Bank', address: BANK },
      { type: 'Safe', address: SAFE },
      { type: 'Investor', address: '0x3333333333333333333333333333333333333333' }
    ] as Team['teamContracts'],
    ...overrides
  }) as Team

describe('teamTreasury', () => {
  it('selects only the accounts that contribute to a company treasury', () => {
    expect(getTeamTreasuryAddresses(makeTeam())).toEqual([BANK, SAFE])
  })

  it('keeps a configured treasury in a loading state before the grouped read lands', () => {
    expect(buildTeamTreasuryDisplay(makeTeam(), {}, true, 'USD')).toEqual({
      state: 'loading',
      formattedTotal: '—',
      accountShares: []
    })
  })

  it('shows unavailable instead of zero when no account balance could be read', () => {
    expect(buildTeamTreasuryDisplay(makeTeam(), {}, false, 'USD')).toEqual({
      state: 'unavailable',
      formattedTotal: '—',
      accountShares: []
    })
  })

  it('keeps a read zero balance distinct from an unavailable balance', () => {
    const treasury = buildTeamTreasuryDisplay(
      makeTeam(),
      { [BANK.toLowerCase()]: 0, [SAFE.toLowerCase()]: 0 },
      false,
      'USD'
    )

    expect(treasury).toEqual({
      state: 'ready',
      formattedTotal: '$0.00',
      accountShares: []
    })
  })

  it('totals successful account reads and retains their relative weights', () => {
    const treasury = buildTeamTreasuryDisplay(
      makeTeam(),
      { [BANK.toLowerCase()]: 100, [SAFE.toLowerCase()]: 300 },
      false,
      'USD'
    )

    expect(treasury.state).toBe('ready')
    expect(treasury.formattedTotal).toBe('$400.00')
    expect(treasury.accountShares).toEqual([
      { label: 'Bank', barClass: 'bg-primary/40', percent: 25, percentLabel: '25%' },
      { label: 'Safe', barClass: 'bg-primary', percent: 75, percentLabel: '75%' }
    ])
  })

  it('uses unrounded values for account shares and keeps positive dust visible', () => {
    const treasury = buildTeamTreasuryDisplay(
      makeTeam(),
      { [BANK]: 0.002, [SAFE]: 0.001 },
      false,
      'USD'
    )
    expect(treasury.formattedTotal).toBe('<$0.01')
    expect(treasury.accountShares[0]?.percent).toBeCloseTo(66.666666)
    expect(treasury.accountShares[1]?.percent).toBeCloseTo(33.333333)
    expect(treasury.accountShares.map((share) => share.percentLabel)).toEqual(['67%', '33%'])
  })
})
