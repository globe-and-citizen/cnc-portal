import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useTeamStore } from '@/stores/teamStore'
import { useUserDataStore } from '@/stores/user'

/**
 * Builds the team-scoped navigation tree for the dashboard sidebar. Kept in a
 * composable so {@link SidebarLayout} stays focused on layout markup.
 */
export function useSidebarNavItems(): ComputedRef<NavigationMenuItem[]> {
  const route = useRoute()
  const userStore = useUserDataStore()
  const teamStore = useTeamStore()

  /** Current team id, falling back to `'1'` before a team is selected. */
  const teamParams = () => ({ id: teamStore.currentTeamId || '1' })

  return computed<NavigationMenuItem[]>(() => [
    {
      label: 'Companies',
      icon: 'heroicons:squares-2x2',
      to: '/teams'
    },
    {
      label: 'Company',
      icon: 'heroicons:home',
      active: route.name === 'show-team',
      to: { name: 'show-team', params: teamParams() }
    },
    {
      label: 'Accounts',
      icon: 'heroicons:currency-dollar',
      to: { name: 'bank-account', params: teamParams() },
      defaultOpen: true,
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
      to: { name: 'payroll-account', params: teamParams() },
      defaultOpen: true,
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
      to: { name: 'community-credit', params: teamParams() }
    },
    {
      label: 'Accounting',
      icon: 'heroicons:book-open',
      to: { name: 'accounting', params: teamParams() },
      defaultOpen: false,
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
      to: { name: 'contract-management', params: teamParams() }
    },
    {
      label: 'SHER Token',
      icon: 'heroicons:chart-pie',
      to: { name: 'sher-token', params: teamParams() }
    },
    {
      label: 'Administration',
      icon: 'heroicons:chart-bar',
      to: { name: 'bod-elections', params: teamParams() },
      children: [
        { label: 'Board Election', to: { name: 'bod-elections', params: teamParams() } },
        { label: 'Proposals', to: { name: 'bod-proposals', params: teamParams() } }
      ]
    },
    {
      label: 'Vesting',
      icon: 'heroicons:lock-closed',
      to: { name: 'vesting', params: teamParams() }
    },
    {
      label: 'Debt Financing',
      icon: 'heroicons:banknotes',
      to: { name: 'fixed-return', params: teamParams() },
      defaultOpen: true,
      children: [
        { label: 'Fixed Return', to: { name: 'fixed-return', params: teamParams() } },
        { label: 'Browse & Lend', to: { name: 'lender-marketplace', params: teamParams() } }
      ]
    }
  ])
}
