import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { Team } from '@/types/team'
import { mockUserStore } from '@/tests/mocks'
import {
  useTeamsTreasury,
  buildSegments,
  buildCompanyTreasury,
  buildAggregate,
  deriveRole,
  formatUsd,
  formatPol,
  POL_PRICE_USD
} from '../useTeamsTreasury'
import { fetchTeamTreasury } from '../treasurySource'

const OWNER = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'

/** Minimal team factory — only the fields the data layer reads. */
function makeTeam(id: string, ownerAddress: string, name = `Team ${id}`): Team {
  return {
    id,
    name,
    description: '',
    isHidden: false,
    isArchived: false,
    members: [],
    ownerAddress: ownerAddress as Team['ownerAddress'],
    teamContracts: []
  }
}

describe('formatUsd', () => {
  it('prefixes a dollar sign and keeps exactly two decimals', () => {
    expect(formatUsd(0)).toBe('$0.00')
    expect(formatUsd(1234.5)).toBe('$1,234.50')
    expect(formatUsd(12840.226)).toBe('$12,840.23')
  })
})

describe('formatPol', () => {
  it('prefixes ≈ and suffixes POL with at most one decimal', () => {
    expect(formatPol(0)).toBe('≈ 0 POL')
    expect(formatPol(30105.12)).toBe('≈ 30,105.1 POL')
  })
})

describe('deriveRole', () => {
  it('is owner when the user owns the team (case-insensitive)', () => {
    expect(deriveRole(makeTeam('a', OWNER.toUpperCase()), OWNER)).toBe('owner')
  })

  it('is employee when the user is not the owner', () => {
    expect(deriveRole(makeTeam('a', OWNER), OTHER)).toBe('employee')
  })

  it('is employee when the user address is missing', () => {
    expect(deriveRole(makeTeam('a', OWNER), null)).toBe('employee')
  })
})

describe('buildSegments', () => {
  it('computes pct from value/total and the set sums to exactly 100', () => {
    const segments = buildSegments([
      { label: 'Bank', valueUsd: 30, color: '#a' },
      { label: 'Safe', valueUsd: 60, color: '#b' },
      { label: 'Cash', valueUsd: 10, color: '#c' }
    ])
    expect(segments.map((s) => s.pct)).toEqual([30, 60, 10])
    expect(segments.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
    expect(segments[0]).toMatchObject({ label: 'Bank', valueUsd: 30, color: '#a' })
  })

  it('folds rounding drift onto the largest slice so the set still sums to 100', () => {
    // 1/3 each rounds to 33,33,33 = 99; the +1 drift lands on a slice.
    const segments = buildSegments([
      { label: 'A', valueUsd: 1, color: '#a' },
      { label: 'B', valueUsd: 1, color: '#b' },
      { label: 'C', valueUsd: 1, color: '#c' }
    ])
    expect(segments.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
  })

  it('returns an empty list when the total is zero', () => {
    expect(buildSegments([{ label: 'A', valueUsd: 0, color: '#a' }])).toEqual([])
    expect(buildSegments([])).toEqual([])
  })
})

describe('buildCompanyTreasury', () => {
  it('is deterministic for a given team id', () => {
    const a = buildCompanyTreasury(makeTeam('deterministic', OWNER), OWNER)
    const b = buildCompanyTreasury(makeTeam('deterministic', OTHER), OTHER)
    expect(a.balanceUsd).toBe(b.balanceUsd)
    expect(a.byAccount).toEqual(b.byAccount)
    expect(a.byToken).toEqual(b.byToken)
  })

  it('sums account values into balanceUsd and labels it', () => {
    const company = buildCompanyTreasury(makeTeam('x', OWNER), OWNER)
    const { accounts } = fetchTeamTreasury(makeTeam('x', OWNER))
    const expected = accounts.reduce((sum, account) => sum + account.valueUsd, 0)
    expect(company.balanceUsd).toBeCloseTo(expected, 5)
    expect(company.balanceLabel).toBe(formatUsd(company.balanceUsd))
  })

  it('derives the POL approximation from the fixed placeholder price', () => {
    const company = buildCompanyTreasury(makeTeam('x', OWNER), OWNER)
    expect(company.polApprox).toBeCloseTo(company.balanceUsd / POL_PRICE_USD, 5)
    expect(company.polLabel).toBe(formatPol(company.polApprox))
  })

  it('carries the role onto the company snapshot', () => {
    expect(buildCompanyTreasury(makeTeam('x', OWNER), OWNER).role).toBe('owner')
    expect(buildCompanyTreasury(makeTeam('x', OWNER), OTHER).role).toBe('employee')
  })

  it('produces account and token segments that sum to ~100', () => {
    const company = buildCompanyTreasury(makeTeam('segments', OWNER), OWNER)
    expect(company.byAccount.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
    expect(company.byToken.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
  })
})

describe('buildAggregate', () => {
  it('splits the total into own vs member by role', () => {
    const teams = [makeTeam('o1', OWNER), makeTeam('o2', OWNER), makeTeam('e1', OTHER)]
    const teamsById = new Map(teams.map((team) => [team.id, team]))
    const companies = teams.map((team) =>
      buildCompanyTreasury(team, team.id.startsWith('o') ? OWNER : OTHER)
    )
    const aggregate = buildAggregate(companies, teamsById)

    const expectedOwn = companies
      .filter((c) => c.role === 'owner')
      .reduce((sum, c) => sum + c.balanceUsd, 0)
    expect(aggregate.ownUsd).toBeCloseTo(expectedOwn, 5)
    expect(aggregate.memberUsd).toBeCloseTo(aggregate.totalUsd - expectedOwn, 5)
    expect(aggregate.totalLabel).toBe(formatUsd(aggregate.totalUsd))
    expect(aggregate.ownLabel).toBe(formatUsd(aggregate.ownUsd))
    expect(aggregate.memberLabel).toBe(formatUsd(aggregate.memberUsd))
  })

  it('emits one company segment per team labelled by team name, summing to 100', () => {
    const teams = [makeTeam('a', OWNER, 'Alpha'), makeTeam('b', OWNER, 'Beta')]
    const teamsById = new Map(teams.map((team) => [team.id, team]))
    const companies = teams.map((team) => buildCompanyTreasury(team, OWNER))
    const aggregate = buildAggregate(companies, teamsById)

    expect(aggregate.byCompany).toHaveLength(2)
    expect(aggregate.byCompany.map((s) => s.label).sort()).toEqual(['Alpha', 'Beta'])
    expect(aggregate.byCompany.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
  })

  it('sums tokens and accounts across companies', () => {
    const teams = [makeTeam('a', OWNER), makeTeam('b', OWNER)]
    const teamsById = new Map(teams.map((team) => [team.id, team]))
    const companies = teams.map((team) => buildCompanyTreasury(team, OWNER))
    const aggregate = buildAggregate(companies, teamsById)

    expect(aggregate.byToken.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
    expect(aggregate.byAccount.reduce((sum, s) => sum + s.pct, 0)).toBe(100)
  })

  it('zeroes everything for an empty company list', () => {
    const aggregate = buildAggregate([], new Map())
    expect(aggregate.totalUsd).toBe(0)
    expect(aggregate.ownUsd).toBe(0)
    expect(aggregate.memberUsd).toBe(0)
    expect(aggregate.totalLabel).toBe('$0.00')
    expect(aggregate.byCompany).toEqual([])
    expect(aggregate.byToken).toEqual([])
    expect(aggregate.byAccount).toEqual([])
  })
})

describe('useTeamsTreasury', () => {
  beforeEach(() => {
    mockUserStore.address = OWNER
  })

  it('derives owner vs employee role from the mocked user store address', () => {
    const teams = [makeTeam('mine', OWNER), makeTeam('theirs', OTHER)]
    const { byTeamId } = useTeamsTreasury(() => teams)
    expect(byTeamId.value.mine!.role).toBe('owner')
    expect(byTeamId.value.theirs!.role).toBe('employee')
  })

  it('exposes one company entry per team, keyed by team id', () => {
    const teams = [makeTeam('a', OWNER), makeTeam('b', OTHER)]
    const { companies, byTeamId } = useTeamsTreasury(() => teams)
    expect(companies.value).toHaveLength(2)
    expect(Object.keys(byTeamId.value).sort()).toEqual(['a', 'b'])
  })

  it('aggregate own/member split matches the per-team roles', () => {
    const teams = [makeTeam('a', OWNER), makeTeam('b', OTHER)]
    const { companies, aggregate } = useTeamsTreasury(() => teams)
    const own = companies.value.find((c) => c.teamId === 'a')!
    const member = companies.value.find((c) => c.teamId === 'b')!
    expect(aggregate.value.ownUsd).toBeCloseTo(own.balanceUsd, 5)
    expect(aggregate.value.memberUsd).toBeCloseTo(member.balanceUsd, 5)
    expect(aggregate.value.totalUsd).toBeCloseTo(own.balanceUsd + member.balanceUsd, 5)
  })

  it('reacts to the teams source changing', () => {
    const teams = ref<Team[]>([makeTeam('a', OWNER)])
    const { companies } = useTeamsTreasury(teams)
    expect(companies.value).toHaveLength(1)
    teams.value = [makeTeam('a', OWNER), makeTeam('b', OWNER)]
    expect(companies.value).toHaveLength(2)
  })

  it('yields a zeroed aggregate and empty lists for undefined / empty teams', () => {
    const { companies, byTeamId, aggregate } = useTeamsTreasury(() => undefined)
    expect(companies.value).toEqual([])
    expect(byTeamId.value).toEqual({})
    expect(aggregate.value.totalUsd).toBe(0)
    expect(aggregate.value.byCompany).toEqual([])

    const empty = useTeamsTreasury(() => [])
    expect(empty.aggregate.value.totalLabel).toBe('$0.00')
  })

  it('reads the role from the user store address at evaluation time', () => {
    mockUserStore.address = OTHER
    const { byTeamId } = useTeamsTreasury(() => [makeTeam('a', OWNER)])
    expect(byTeamId.value.a!.role).toBe('employee')
  })
})
