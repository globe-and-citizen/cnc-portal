import { ref, computed } from 'vue'
import { useCustomFetch } from '@/composables/useCustomFetch'
import { useTeamStore } from '@/stores'

/**
 * Composable to check submit restriction status for a team
 */
export function useSubmitRestriction() {
  const teamStore = useTeamStore()

  const isRestricted = ref<boolean>(true) // Default to restricted
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const effectiveStatus = ref<string>('enabled')

  /**
   * Check if submit restriction is active for a specific team
   * @param teamId - Team ID (can be string or number)
   */
  const checkRestriction = async (teamId?: string | number): Promise<boolean> => {
    const targetTeamId = teamId ?? teamStore.currentTeam?.id

    if (!targetTeamId) {
      error.value = 'No team ID provided'
      return true // Default to restricted if no team
    }

    // Ensure teamId is a valid number
    const numericTeamId =
      typeof targetTeamId === 'string' ? parseInt(targetTeamId, 10) : targetTeamId

    if (isNaN(numericTeamId)) {
      error.value = 'Invalid team ID'
      return true
    }

    isLoading.value = true
    error.value = null

    try {
      const { data, statusCode } = await useCustomFetch(`teams/${numericTeamId}/submit-restriction`)
        .get()
        .json()

      if (statusCode.value !== 200 || !data.value?.success) {
        error.value = 'Failed to check submit restriction'
        isRestricted.value = true // Default to restricted on error
        return true
      }

      isRestricted.value = data.value.data.isRestricted
      effectiveStatus.value = data.value.data.effectiveStatus

      return isRestricted.value
    } catch (e) {
      console.error('Error checking submit restriction:', e)
      error.value = 'An error occurred while checking restriction'
      isRestricted.value = true // Default to restricted on error
      return true
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Computed property to check if current team can submit anytime (no restriction)
   */
  const canSubmitAnytime = computed(() => !isRestricted.value)

  return {
    isRestricted,
    isLoading,
    error,
    effectiveStatus,
    canSubmitAnytime,
    checkRestriction
  }
}
