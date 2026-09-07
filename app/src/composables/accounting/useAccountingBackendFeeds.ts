/**
 * `useAccountingBackendFeeds(teamId)` — the team's off-chain enrichment feeds.
 *
 * Keeps the backend query boundary separate from the on-chain and Safe sources
 * coordinated by `useCNCAccounting`. The raw query objects are returned unchanged,
 * so the journal owner keeps their `data`, loading state, and refresh controls.
 */
import type { MaybeRefOrGetter } from 'vue'
import { useGetTeamWeeklyClaimsQuery } from '@/queries/weeklyClaim.queries'
import { useGetExpensesQuery } from '@/queries/expense.queries'
import { useGetClassificationsQuery } from '@/queries/classification.queries'

export function useAccountingBackendFeeds(teamId: MaybeRefOrGetter<string | null>) {
  const weeklyClaims = useGetTeamWeeklyClaimsQuery({ queryParams: { teamId } })
  const expenses = useGetExpensesQuery({ queryParams: { teamId } })
  const classifications = useGetClassificationsQuery({ queryParams: { teamId } })

  return { weeklyClaims, expenses, classifications }
}
