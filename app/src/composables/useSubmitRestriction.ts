import { computed } from 'vue'
import { useSubmitRestrictionQuery } from '@/queries/team.queries'
import { useTeamStore } from '@/stores'

/**
 * Composable to check submit restriction status for a team
 */
export function useSubmitRestriction() {
  const teamStore = useTeamStore()

  const teamId = computed(() => teamStore.currentTeam?.id ?? null)

  const { data, isLoading, error, refetch } = useSubmitRestrictionQuery(teamId)

  /**
   * Check if submit restriction is active for a specific team
   * @param specificTeamId - Team ID (can be string or number)
   */
  const checkRestriction = async (specificTeamId?: string | number): Promise<boolean> => {
    const targetTeamId = specificTeamId ?? teamStore.currentTeam?.id

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
