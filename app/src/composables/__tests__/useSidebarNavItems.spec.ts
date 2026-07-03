import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSidebarNavItems } from '@/composables/useSidebarNavItems'
import { mockRoute } from '@/tests/mocks/router.mock'
import { mockTeamStore, mockUserStore } from '@/tests/mocks/store.mock'

/** Flatten the grouped nav into a single list for easier lookups. */
const flatten = (groups: NavigationMenuItem[][]) => groups.flat()

const findByLabel = (groups: NavigationMenuItem[][], label: string) =>
  flatten(groups).find((item) => item.label === label)

/** The team-scoped surfaces that must follow the "has a company" gate. */
const WORKSPACE_LABELS = [
  'Company',
  'Accounts',
  'Payroll',
  'Accounting',
  'Contract Management',
  'SHER Token',
  'Administration'
]

/**
 * Pages that demo the new contracts. Hidden unless
 * VITE_APP_ENABLE_EXPERIMENTAL_FEATURES is 'true'.
 */
const EXPERIMENTAL_LABELS = ['Community Credit', 'Vesting', 'Debt Financing']

describe('useSidebarNavItems', () => {
  beforeEach(() => {
    mockRoute.name = undefined
    mockRoute.params = {}
    mockTeamStore.currentTeamId = null as unknown as string
    // The experimental pages are opt-in; default the flag on so the
    // workspace-gate assertions cover them too. Individual tests override it.
    vi.stubEnv('VITE_APP_ENABLE_EXPERIMENTAL_FEATURES', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
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

      for (const label of [...WORKSPACE_LABELS, ...EXPERIMENTAL_LABELS]) {
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

      for (const label of [...WORKSPACE_LABELS, ...EXPERIMENTAL_LABELS]) {
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

    it('falls back to "Company workspace" when the company has no name yet', () => {
      mockRoute.params = { id: '42' }
      mockTeamStore.currentTeam = undefined as never

      const items = useSidebarNavItems()
      expect(items.value[1][0].label).toBe('Company workspace')
    })
  })

  describe('route-derived item details', () => {
    beforeEach(() => {
      mockRoute.params = { id: '42' }
    })

    const payrollHistoryChild = () => {
      const payroll = findByLabel(useSidebarNavItems().value, 'Payroll')
      return payroll?.children?.find((c) => c.active !== undefined)
    }

    it('labels the payroll-history entry "Member" for another member', () => {
      mockRoute.name = 'payroll-history'
      mockRoute.params = { id: '42', memberAddress: '0xSomeoneElse' }

      const child = payrollHistoryChild()
      expect(child?.label).toBe('Member Payroll History')
      expect(child?.active).toBe(true)
    })

    it('labels the payroll-history entry "My" for the current user', () => {
      mockRoute.name = 'payroll-history'
      mockRoute.params = { id: '42', memberAddress: mockUserStore.address }

      const child = payrollHistoryChild()
      expect(child?.label).toBe('My Payroll History')
      expect(child?.active).toBe(true)
    })

    it('marks Community Credit active on community-credit routes', () => {
      mockRoute.name = 'community-credit-detail'

      expect(findByLabel(useSidebarNavItems().value, 'Community Credit')?.active).toBe(true)
    })

    it('falls back to 0x for the Safe address when none is configured', () => {
      mockTeamStore.getContractAddressByType = vi.fn(() => undefined)

      const accounts = findByLabel(useSidebarNavItems().value, 'Accounts')
      const safe = accounts?.children?.find((c) => c.label === 'Safe Account')
      expect((safe?.to as { params: { address: string } }).params.address).toBe('0x')
    })
  })

  describe('experimental new-contract pages', () => {
    beforeEach(() => {
      mockRoute.params = { id: '42' }
    })

    it('hides Community Credit, Vesting and Debt Financing by default', () => {
      vi.stubEnv('VITE_APP_ENABLE_EXPERIMENTAL_FEATURES', '')

      const items = useSidebarNavItems()
      for (const label of EXPERIMENTAL_LABELS) {
        expect(findByLabel(items.value, label), label).toBeUndefined()
      }
    })

    it('surfaces them when the flag is enabled', () => {
      vi.stubEnv('VITE_APP_ENABLE_EXPERIMENTAL_FEATURES', 'true')

      const items = useSidebarNavItems()
      for (const label of EXPERIMENTAL_LABELS) {
        expect(findByLabel(items.value, label), label).toBeDefined()
      }
    })

    it('keeps the workspace surfaces regardless of the flag', () => {
      vi.stubEnv('VITE_APP_ENABLE_EXPERIMENTAL_FEATURES', '')

      const items = useSidebarNavItems()
      for (const label of WORKSPACE_LABELS) {
        expect(findByLabel(items.value, label), label).toBeDefined()
      }
    })
  })
})
