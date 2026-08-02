import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useCompaniesFilter, type CompanyRoleFilter } from '@/composables/useCompaniesFilter'
import type { Team } from '@/types/team'

const USER = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: '1',
    name: 'Team',
    description: '',
    isHidden: false,
    isArchived: false,
    members: [],
    ownerAddress: OTHER as Team['ownerAddress'],
    teamContracts: [],
    ...overrides
  }
}

describe('useCompaniesFilter', () => {
  describe('counts', () => {
    it('splits visible teams into owner / employee buckets', () => {
      const teams = [
        makeTeam({ id: '1', ownerAddress: USER as Team['ownerAddress'] }),
        makeTeam({ id: '2', ownerAddress: USER as Team['ownerAddress'] }),
        makeTeam({ id: '3', ownerAddress: OTHER as Team['ownerAddress'] })
      ]
      const { counts } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(counts.value).toEqual({ all: 3, owner: 2, employee: 1 })
    })

    it('matches owner address case-insensitively', () => {
      const teams = [makeTeam({ ownerAddress: USER.toUpperCase() as Team['ownerAddress'] })]
      const { counts } = useCompaniesFilter(teams, {
        userAddress: USER.toLowerCase(),
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(counts.value).toEqual({ all: 1, owner: 1, employee: 0 })
    })

    it('ignores role + query when computing counts', () => {
      const teams = [
        makeTeam({ id: '1', name: 'Alpha', ownerAddress: USER as Team['ownerAddress'] }),
        makeTeam({ id: '2', name: 'Beta', ownerAddress: OTHER as Team['ownerAddress'] })
      ]
      const { counts } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'owner',
        query: 'zzz',
        showHidden: false,
        showArchived: false
      })
      expect(counts.value).toEqual({ all: 2, owner: 1, employee: 1 })
    })

    it('returns zeros for null / non-array input', () => {
      const { counts, filtered } = useCompaniesFilter(null, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(counts.value).toEqual({ all: 0, owner: 0, employee: 0 })
      expect(filtered.value).toEqual([])
    })
  })

  describe('role filter', () => {
    const teams = [
      makeTeam({ id: '1', name: 'Owned', ownerAddress: USER as Team['ownerAddress'] }),
      makeTeam({ id: '2', name: 'Joined', ownerAddress: OTHER as Team['ownerAddress'] })
    ]

    it("keeps everything for role 'all'", () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1', '2'])
    })

    it("keeps only owned teams for role 'owner'", () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'owner',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1'])
    })

    it("keeps only employee teams for role 'employee'", () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'employee',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['2'])
    })
  })

  describe('query match', () => {
    const teams = [
      makeTeam({ id: '1', name: 'Acme Corp', description: 'rockets' }),
      makeTeam({ id: '2', name: 'Globex', description: 'widgets' })
    ]

    it('matches the team name case-insensitively', () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: 'ACME',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1'])
    })

    it('matches the team description', () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: 'widget',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['2'])
    })

    it('ignores surrounding whitespace and an empty query', () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '   ',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value).toHaveLength(2)
    })
  })

  describe('visibility', () => {
    const teams = [
      makeTeam({ id: '1', name: 'Active' }),
      makeTeam({ id: '2', name: 'Hidden', isHidden: true }),
      makeTeam({ id: '3', name: 'Archived', isArchived: true })
    ]

    it('drops hidden and archived teams by default', () => {
      const { filtered, counts } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1'])
      expect(counts.value.all).toBe(1)
    })

    it('keeps hidden teams when showHidden is on', () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: true,
        showArchived: false
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1', '2'])
    })

    it('keeps archived teams when showArchived is on', () => {
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role: 'all',
        query: '',
        showHidden: false,
        showArchived: true
      })
      expect(filtered.value.map((t) => t.id)).toEqual(['1', '3'])
    })
  })

  describe('reactivity', () => {
    it('recomputes when reactive inputs change', () => {
      const role = ref<CompanyRoleFilter>('all')
      const query = ref('')
      const teams = ref([
        makeTeam({ id: '1', name: 'Owned', ownerAddress: USER as Team['ownerAddress'] }),
        makeTeam({ id: '2', name: 'Joined', ownerAddress: OTHER as Team['ownerAddress'] })
      ])
      const { filtered } = useCompaniesFilter(teams, {
        userAddress: USER,
        role,
        query,
        showHidden: false,
        showArchived: false
      })

      expect(filtered.value).toHaveLength(2)

      role.value = 'owner'
      expect(filtered.value.map((t) => t.id)).toEqual(['1'])

      role.value = 'all'
      query.value = 'joined'
      expect(filtered.value.map((t) => t.id)).toEqual(['2'])
    })
  })
})
