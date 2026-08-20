import { computed, type ComputedRef } from 'vue'
import { useRoute } from 'vue-router'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useTeamStore } from '@/stores/teamStore'
import { useUserDataStore } from '@/stores/user'

/**
 * Builds the sidebar navigation as two groups:
 *
 * 1. **Companies** — the portfolio entry point, always reachable.
 * 2. **Company workspace** — the team-scoped surfaces (Overview, Accounts,
 *    Payroll, …). These are disabled until a company is selected, since they
 *    have no team to operate on; the group label then shows the active
 *    company's name.
 *
 * ## Uniform open/close & highlight logic
 *
 * Every parent that has children follows the **same** rule, so the menu reads
 * consistently everywhere:
 *
 * - `value` — a stable accordion key, used by {@link SidebarLayout} to drive the
 *   controlled "one section open at a time" accordion.
 * - `active` — the parent is highlighted when the current route belongs to its
 *   section, and `defaultOpen` mirrors it so that section auto-expands.
 * - each child carries its own `active` for the exact-route highlight.
 *
 * Kept in a composable so {@link SidebarLayout} stays focused on layout markup.
 */
export function useSidebarNavItems(): ComputedRef<NavigationMenuItem[][]> {
  const route = useRoute()
  const userStore = useUserDataStore()
  const teamStore = useTeamStore()

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
    const name = String(route.name ?? '')

    // Which parent section the current route belongs to. Drives both the active
    // highlight and the auto-expand, uniformly for every menu with children.
    const inAccounts = ['bank-account', 'safe-account', 'expense-account'].includes(name)
    const inPayroll = [
      'payroll-account',
      'payroll-history',
      'team-payroll',
      'cash-remunerations-member'
    ].includes(name)
    const inCommunity = name.startsWith('community-credit')
    const inAccounting = name.startsWith('accounting')
    const inAdministration = name.startsWith('bod-')
    const inPaymentGate = name.startsWith('payment-gate')

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
          value: 'accounts',
          active: inAccounts,
          disabled,
          to: { name: 'bank-account', params: teamParams() },
          defaultOpen: hasCompany.value && inAccounts,
          children: [
            {
              label: 'Bank Account',
              active: name === 'bank-account',
              to: { name: 'bank-account', params: teamParams() }
            },
            {
              label: 'Safe Account',
              active: name === 'safe-account',
              to: {
                name: 'safe-account',
                params: {
                  id: teamStore.currentTeamId || '1',
                  address: teamStore.getContractAddressByType('Safe') || '0x'
                }
              }
            },
            {
              label: 'Expense Account',
              active: name === 'expense-account',
              to: { name: 'expense-account', params: teamParams() }
            }
          ]
        },
        {
          label: 'Payroll',
          icon: 'heroicons:currency-dollar',
          value: 'payroll',
          active: inPayroll,
          disabled,
          to: { name: 'payroll-account', params: teamParams() },
          defaultOpen: hasCompany.value && inPayroll,
          children: [
            {
              label: 'Payroll Account',
              active: name === 'payroll-account',
              to: { name: 'payroll-account', params: teamParams() }
            },
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
            {
              label: 'Company Payroll',
              active: name === 'team-payroll',
              to: { name: 'team-payroll', params: teamParams() }
            }
          ]
        },
        {
          label: 'Community Credit',
          icon: 'heroicons:hand-raised',
          value: 'community-credit',
          active: inCommunity,
          disabled,
          to: { name: 'community-credit', params: teamParams() },
          defaultOpen: hasCompany.value && inCommunity,
          children: [
            {
              label: 'Rounds',
              active: name === 'community-credit',
              to: { name: 'community-credit', params: teamParams() }
            },
            {
              label: 'New credit call',
              active: name === 'community-credit-new',
              to: { name: 'community-credit-new', params: teamParams() }
            }
          ]
        },
        {
          label: 'Accounting',
          value: 'accounting',
          icon: 'heroicons:book-open',
          active: inAccounting,
          disabled,
          to: { name: 'accounting', params: teamParams() },
          defaultOpen: hasCompany.value && inAccounting,
          children: [
            {
              label: 'Summary',
              active: name === 'accounting-summary',
              to: { name: 'accounting-summary', params: teamParams() }
            },
            {
              label: 'Income Statement',
              active: name === 'accounting-income',
              to: { name: 'accounting-income', params: teamParams() }
            },
            {
              label: 'Balance Sheet',
              active: name === 'accounting-balance',
              to: { name: 'accounting-balance', params: teamParams() }
            },
            {
              label: 'Trial Balance',
              active: name === 'accounting-trial',
              to: { name: 'accounting-trial', params: teamParams() }
            },
            {
              label: 'General Ledger',
              active: name === 'accounting-ledger',
              to: { name: 'accounting-ledger', params: teamParams() }
            }
          ]
        },
        {
          label: 'Contract Management',
          icon: 'heroicons:wrench',
          active: route.name === 'contract-management',
          disabled,
          to: { name: 'contract-management', params: teamParams() }
        },
        {
          label: 'SHER Token',
          icon: 'heroicons:chart-pie',
          active: route.name === 'sher-token',
          disabled,
          to: { name: 'sher-token', params: teamParams() }
        },
        {
          label: 'Payment Gate',
          icon: 'heroicons:credit-card',
          value: 'payment-gate',
          active: inPaymentGate,
          disabled,
          to: { name: 'payment-gate', params: teamParams() },
          defaultOpen: hasCompany.value && inPaymentGate,
          children: [
            {
              label: 'Setup',
              active: name === 'payment-gate',
              to: { name: 'payment-gate', params: teamParams() }
            },
            {
              label: 'Reference',
              active: name === 'payment-gate-reference',
              to: { name: 'payment-gate-reference', params: teamParams() }
            },
            {
              label: 'History',
              active: name === 'payment-gate-history',
              to: { name: 'payment-gate-history', params: teamParams() }
            }
          ]
        },
        {
          label: 'Administration',
          icon: 'heroicons:chart-bar',
          value: 'administration',
          active: inAdministration,
          disabled,
          to: { name: 'bod-elections', params: teamParams() },
          defaultOpen: hasCompany.value && inAdministration,
          children: [
            {
              label: 'Board Election',
              active: name === 'bod-elections' || name === 'bod-elections-details',
              to: { name: 'bod-elections', params: teamParams() }
            },
            {
              label: 'Proposals',
              active: name === 'bod-proposals' || name === 'proposal-detail',
              to: { name: 'bod-proposals', params: teamParams() }
            }
          ]
        },
        {
          label: 'Vesting',
          icon: 'heroicons:lock-closed',
          active: route.name === 'vesting',
          disabled,
          to: { name: 'vesting', params: teamParams() }
        }
      ]
    ]
  })
}
