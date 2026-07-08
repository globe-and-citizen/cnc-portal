import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import { useLocalStorage } from '@vueuse/core'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useTeamStore } from '@/stores/teamStore'
import { useUserDataStore } from '@/stores/user'

/** localStorage key for the Accounting sidebar menu's expanded state. */
export const ACCOUNTING_MENU_KEY = 'sidebar_accounting_expanded'

/**
 * Builds the sidebar navigation as two groups:
 *
 * 1. **Companies** — the portfolio entry point, always reachable.
 * 2. **Company workspace** — the team-scoped surfaces (Overview, Accounts,
 *    Payroll, …). These are disabled until a company is selected, since they
 *    have no team to operate on; the group label then shows the active
 *    company's name.
 *
 * Kept in a composable so {@link SidebarLayout} stays focused on layout markup.
 */
export function useSidebarNavItems(): ComputedRef<NavigationMenuItem[][]> {
  const route = useRoute()
  const userStore = useUserDataStore()
  const teamStore = useTeamStore()

  // Persisted expanded state of the Accounting menu — read to seed `defaultOpen`
  // so a reload restores it; written from {@link SidebarLayout} on toggle.
  const accountingExpanded = useLocalStorage(ACCOUNTING_MENU_KEY, false)

  /**
   * A company is selected when the route is scoped to one (`/teams/:id/…`) or
   * the store still holds the last selection. Mirrors the `activeTeamId`
   * derivation in {@link TeamSelectMenu}.
   */
  const hasCompany = computed(() => Boolean(route.params.id ?? teamStore.currentTeamId))

  /** Current team id, falling back to `'1'` before a team is selected. */
  const teamParams = () => ({ id: teamStore.currentTeamId || '1' })

  return computed<NavigationMenuItem[][]>(() => {
    const disabled = !hasCompany.value

    return [
      [
        {
          label: 'Companies',
          icon: 'heroicons:building-office-2',
          active: route.name === 'teams',
          to: '/teams'
        }
      ],
      [
        {
          label: hasCompany.value
            ? (teamStore.currentTeam?.name ?? 'Company workspace')
            : 'Company workspace',
          type: 'label'
        },
        {
          label: 'Company',
          icon: 'heroicons:home',
          active: route.name === 'show-team',
          disabled,
          to: { name: 'show-team', params: teamParams() }
        },
        {
          label: 'Accounts',
          icon: 'heroicons:currency-dollar',
          disabled,
          to: { name: 'bank-account', params: teamParams() },
          defaultOpen: hasCompany.value,
          children: [
            { label: 'Bank Account', to: { name: 'bank-account', params: teamParams() } },
            {
              label: 'Safe Account',
              to: {
                name: 'safe-account',
                params: {
                  id: teamStore.currentTeamId || '1',
                  address: teamStore.getContractAddressByType('Safe') || '0x'
                }
              }
            },
            { label: 'Expense Account', to: { name: 'expense-account', params: teamParams() } }
          ]
        },
        {
          label: 'Payroll',
          icon: 'heroicons:currency-dollar',
          disabled,
          to: { name: 'payroll-account', params: teamParams() },
          defaultOpen: hasCompany.value,
          children: [
            { label: 'Payroll Account', to: { name: 'payroll-account', params: teamParams() } },
            {
              label:
                route.name === 'payroll-history' && route.params.memberAddress !== userStore.address
                  ? 'Member Payroll History'
                  : 'My Payroll History',
              active: route.name === 'payroll-history',
              to: {
                name: 'payroll-history',
                params: { id: teamStore.currentTeamId || '1', memberAddress: userStore.address }
              }
            },
            { label: 'Company Payroll', to: { name: 'team-payroll', params: teamParams() } }
          ]
        },
        {
          label: 'Community Credit',
          icon: 'heroicons:hand-raised',
          active: String(route.name ?? '').startsWith('community-credit'),
          disabled,
          to: { name: 'community-credit', params: teamParams() },
          defaultOpen: false,
          children: [
            { label: 'Rounds', to: { name: 'community-credit', params: teamParams() } },
            {
              label: 'New credit call',
              to: { name: 'community-credit-new', params: teamParams() }
            }
          ]
        },
        {
          label: 'Accounting',
          // Stable accordion value so its open state can be tracked/persisted
          // independently of its position in the list.
          value: 'accounting',
          icon: 'heroicons:book-open',
          disabled,
          to: { name: 'accounting', params: teamParams() },
          // Closed by default; the persisted "open" is only honoured inside a
          // company, so on the companies list it collapses like the others.
          defaultOpen: hasCompany.value && accountingExpanded.value,
          children: [
            { label: 'Summary', to: { name: 'accounting-summary', params: teamParams() } },
            { label: 'Income Statement', to: { name: 'accounting-income', params: teamParams() } },
            { label: 'Balance Sheet', to: { name: 'accounting-balance', params: teamParams() } },
            { label: 'Trial Balance', to: { name: 'accounting-trial', params: teamParams() } },
            { label: 'General Ledger', to: { name: 'accounting-ledger', params: teamParams() } }
          ]
        },
        {
          label: 'Contract Management',
          icon: 'heroicons:wrench',
          disabled,
          to: { name: 'contract-management', params: teamParams() }
        },
        {
          label: 'SHER Token',
          icon: 'heroicons:chart-pie',
          disabled,
          to: { name: 'sher-token', params: teamParams() }
        },
        {
          label: 'Administration',
          icon: 'heroicons:chart-bar',
          disabled,
          to: { name: 'bod-elections', params: teamParams() },
          children: [
            { label: 'Board Election', to: { name: 'bod-elections', params: teamParams() } },
            { label: 'Proposals', to: { name: 'bod-proposals', params: teamParams() } }
          ]
        },
        {
          label: 'Vesting',
          icon: 'heroicons:lock-closed',
          disabled,
          to: { name: 'vesting', params: teamParams() }
        },
        {
          label: 'Debt Financing',
          icon: 'heroicons:banknotes',
          disabled,
          to: { name: 'fixed-return', params: teamParams() },
          defaultOpen: hasCompany.value,
          children: [
            { label: 'Fixed Return', to: { name: 'fixed-return', params: teamParams() } },
            { label: 'Browse & Lend', to: { name: 'lender-marketplace', params: teamParams() } }
          ]
        }
      ]
    ]
  })
}
