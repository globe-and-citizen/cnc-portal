import { beforeEach, describe, expect, it } from 'vitest'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSidebarNavItems } from '@/composables/useSidebarNavItems'
import { mockRoute } from '@/tests/mocks/router.mock'
import { mockTeamStore } from '@/tests/mocks/store.mock'

/** Flatten the grouped nav into a single list for easier lookups. */
const flatten = (groups: NavigationMenuItem[][]) => groups.flat()

const findByLabel = (groups: NavigationMenuItem[][], label: string) =>
  flatten(groups).find((item) => item.label === label)

/** The team-scoped surfaces that must follow the "has a company" gate. */
const WORKSPACE_LABELS = [
  'Company',
  'Accounts',
  'Payroll',
  'Community Credit',
  'Accounting',
  'Contract Management',
  'SHER Token',
  'Administration',
  'Vesting',
  'Debt Financing'
]

describe('useSidebarNavItems', () => {
  beforeEach(() => {
    mockRoute.name = undefined
    mockRoute.params = {}
    mockTeamStore.currentTeamId = null as unknown as string
  })

  it('exposes Companies as a standalone first group with the building icon', () => {
    const items = useSidebarNavItems()
    const companies = items.value[0][0]

    expect(companies.label).toBe('Companies')
    expect(companies.icon).toBe('heroicons:building-office-2')
    expect(companies.to).toBe('/teams')
  })

  it('marks Companies active only on the teams list route', () => {
    const items = useSidebarNavItems()
    expect(items.value[0][0].active).toBe(false)

    mockRoute.name = 'teams'
    expect(items.value[0][0].active).toBe(true)
  })

  describe('when no company is selected', () => {
    it('labels the workspace group "Company workspace"', () => {
      const items = useSidebarNavItems()
      const label = items.value[1][0]

      expect(label.type).toBe('label')
      expect(label.label).toBe('Company workspace')
    })

    it('disables every workspace surface', () => {
      const items = useSidebarNavItems()

      for (const label of WORKSPACE_LABELS) {
        expect(findByLabel(items.value, label)?.disabled, label).toBe(true)
      }
    })

    it('keeps accordion surfaces collapsed', () => {
      const items = useSidebarNavItems()
      expect(findByLabel(items.value, 'Accounts')?.defaultOpen).toBe(false)
    })
  })

  describe('when a company is selected', () => {
    beforeEach(() => {
      mockRoute.name = 'show-team'
      mockRoute.params = { id: '42' }
    })

    it('shows the selected company name as the group label', () => {
      mockTeamStore.currentTeam = { ...mockTeamStore.currentTeam, name: 'Layer8 Core' }

      const items = useSidebarNavItems()
      expect(items.value[1][0].label).toBe('Layer8 Core')
    })

    it('enables every workspace surface', () => {
      const items = useSidebarNavItems()

      for (const label of WORKSPACE_LABELS) {
        expect(findByLabel(items.value, label)?.disabled, label).toBe(false)
      }
    })

    it('treats a lingering store selection as a selected company', () => {
      mockRoute.name = undefined
      mockRoute.params = {}
      mockTeamStore.currentTeamId = '7'

      const items = useSidebarNavItems()
      expect(findByLabel(items.value, 'Accounts')?.disabled).toBe(false)
    })
  })
})
