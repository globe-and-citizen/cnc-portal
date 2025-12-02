import type { Team } from '~/types'
import { useAuthStore } from '~/stores/useAuthStore'

export function useTeams() {
  const runtimeConfig = useRuntimeConfig()
  const backendUrl = runtimeConfig.public.backendUrl
  const authStore = useAuthStore()

  const teams = ref<Team[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch all teams from the backend API
   */
  const fetchTeams = async (): Promise<Team[]> => {
    isLoading.value = true
    error.value = null

    try {
      const token = authStore.getToken()
      if (!token) {
        error.value = 'Authentication required'
        return []
      }

      const response = await fetch(`${backendUrl}/api/teams`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          error.value = 'Authentication expired. Please sign in again.'
          authStore.clearAuth()
        } else {
          error.value = 'Failed to fetch teams'
        }
        return []
      }

      const data = await response.json()
      teams.value = data
      return data
    } catch (e) {
      console.error('Error fetching teams:', e)
      error.value = 'An error occurred while fetching teams'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get computed stats for teams
   */
  const stats = computed(() => {
    const totalTeams = teams.value.length
    const totalMembers = teams.value.reduce((sum, team) => sum + (team._count?.members || 0), 0)
    const teamsWithOfficer = teams.value.filter(team => team.officerAddress).length
    const avgMembersPerTeam = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0

    return {
      totalTeams,
      totalMembers,
      teamsWithOfficer,
      avgMembersPerTeam
    }
  })

  return {
    teams,
    isLoading,
    error,
    stats,
    fetchTeams
  }
}
