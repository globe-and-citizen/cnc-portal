import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSidebarNavItems, ACCOUNTING_MENU_KEY } from '@/composables/useSidebarNavItems'
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

    it('falls back to "Company workspace" when the company has no name yet', () => {
      mockRoute.params = { id: '42' }
      mockTeamStore.currentTeam = undefined as never

      const items = useSidebarNavItems()
      expect(items.value[1][0].label).toBe('Company workspace')
    })
  })

  describe('Accounting menu persistence', () => {
    beforeEach(() => {
      localStorage.clear()
      // Default to a specific team context.
      mockRoute.params = { id: '42' }
    })

    it('gives the Accounting item a stable accordion value', () => {
      const accounting = findByLabel(useSidebarNavItems().value, 'Accounting')
      expect(accounting?.value).toBe('accounting')
    })

    it('stays closed by default even when persisted open on the companies list', () => {
      localStorage.setItem(ACCOUNTING_MENU_KEY, 'true')
      mockRoute.params = {}
      mockTeamStore.currentTeamId = null as unknown as string

      expect(findByLabel(useSidebarNavItems().value, 'Accounting')?.defaultOpen).toBe(false)
    })

    it('restores the persisted open state inside a company', () => {
      // No persistence → collapsed, like the other menus.
      expect(findByLabel(useSidebarNavItems().value, 'Accounting')?.defaultOpen).toBe(false)

      localStorage.setItem(ACCOUNTING_MENU_KEY, 'true')
      expect(findByLabel(useSidebarNavItems().value, 'Accounting')?.defaultOpen).toBe(true)
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
})
