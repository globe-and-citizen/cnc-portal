import { computed } from 'vue'
import { useGetSubmitRestrictionQuery } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'

/**
 * Composable to check submit restriction status for a team
 */
export function useSubmitRestriction() {
  const teamStore = useTeamStore()

  const teamId = computed(() => teamStore.currentTeam?.id ?? null)

  const { data, isLoading, error, refetch } = useGetSubmitRestrictionQuery({
    pathParams: { teamId }
  })

  /**
   * Check if submit restriction is active for the current team.
   * Note: The specificTeamId parameter is deprecated. The query always uses
   * the current team from the store. This parameter is kept for backward compatibility.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const checkRestriction = async (_specificTeamId?: string | number): Promise<boolean> => {
    const targetTeamId = teamStore.currentTeam?.id

    if (!targetTeamId) {
      return true // Default to restricted if no team
    }

    // Refetch with the current team context
    await refetch()
    return data.value?.isRestricted ?? true
  }

  const isRestricted = computed(() => data.value?.isRestricted ?? true)
  const effectiveStatus = computed(() => data.value?.effectiveStatus ?? 'enabled')

  /**
   * Computed property to check if current team can submit anytime (no restriction)
   */
  const canSubmitAnytime = computed(() => !isRestricted.value)

  const errorMessage = computed(() => {
    if (error.value) {
      return 'Failed to check submit restriction'
    }
    return null
  })

  return {
    isRestricted,
    isLoading,
    error: errorMessage,
    effectiveStatus,
    canSubmitAnytime,
    checkRestriction
  }
}
