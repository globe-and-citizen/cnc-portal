/**
 * `useAccountingBackendFeeds(teamId)` — the team's off-chain enrichment feeds.
 *
 * Groups the backend-DB queries the books read for off-chain context: signed weekly
 * claims, approved expenses, and the manual Bank/Safe transaction classifications
 * (issue #2457) that overlay the address inference. The raw query objects are returned
 * unchanged, so callers keep their `data` / `isLoading` / `refetch`.
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
