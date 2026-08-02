/**
 * Turns a ledger posting's {@link ActivityDestination} — a pure "which section"
 * answer — into a real route, and navigates to it.
 *
 * The presenter can say a posting belongs to the Expense Account or to a credit
 * round, but not *whose*: the team id lives on the route (or in the team store),
 * and the Safe Account is addressed by contract. Those runtime bits are resolved
 * here, so {@link @/utils/accounting/activityDestination} stays pure.
 *
 * `routeFor` returns `null` whenever the jump can't be built — no team in scope,
 * a Safe the team doesn't have, a round with no id — which is what lets the table
 * render the Activity as plain text rather than a link that would go nowhere.
 */
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { useTeamStore } from '@/stores/teamStore'
import type { ActivityDestination } from '@/utils/accounting/activityDestination'

export function useActivityDestination() {
  const route = useRoute()
  const router = useRouter()
  const teamStore = useTeamStore()

  /** The team the ledger is being read for — the route wins, the store backs it up. */
  const teamId = (): string => String(route.params.id ?? teamStore.currentTeamId ?? '')

  function routeFor(destination?: ActivityDestination | null): RouteLocationRaw | null {
    const id = teamId()
    if (!destination || !id) return null

    switch (destination.section) {
      case 'bank':
        return { name: 'bank-account', params: { id } }
      case 'safe': {
        const address = teamStore.getContractAddressByType('Safe')
        return address ? { name: 'safe-account', params: { id, address } } : null
      }
      case 'expense':
        return { name: 'expense-account', params: { id } }
      case 'payroll':
        return { name: 'payroll-account', params: { id } }
      case 'payroll-history':
        return destination.memberAddress
          ? {
              name: 'payroll-history',
              params: { id, memberAddress: destination.memberAddress }
            }
          : null
      case 'community-credit':
        return { name: 'community-credit', params: { id } }
      case 'credit-round':
        return destination.roundId
          ? { name: 'community-credit-round', params: { id, roundId: destination.roundId } }
          : null
      case 'sher-token':
        return { name: 'sher-token', params: { id } }
    }
  }

  /** Navigate to where the posting happened; a no-op when there's nowhere to go. */
  function open(destination?: ActivityDestination | null): void {
    const to = routeFor(destination)
    if (to) router.push(to)
  }

  return { routeFor, open }
}
