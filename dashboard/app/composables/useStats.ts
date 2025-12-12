import type {
  StatsOverview,
  TeamStats,
  UserStats,
  ClaimsStats,
  WagesStats,
  ExpensesStats,
  ContractsStats,
  ActionsStats,
  RecentActivity,
  StatsPeriod
} from '~/types'
import { useAuthStore } from '~/stores/useAuthStore'

interface StatsError {
  message: string
  code?: string
}

export function useStats() {
  const runtimeConfig = useRuntimeConfig()
  const backendUrl = runtimeConfig.public.backendUrl
  const authStore = useAuthStore()

  const isLoading = ref(false)
  const error = ref<StatsError | null>(null)

  /**
   * Generic fetch function with authentication
   */
  const fetchStats = async <T>(endpoint: string, params?: Record<string, string>): Promise<T | null> => {
    isLoading.value = true
    error.value = null

    try {
      const token = authStore.getToken()
      if (!token) {
        error.value = { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        return null
      }

      const queryString = params ? `?${new URLSearchParams(params).toString()}` : ''
      const response = await fetch(`${backendUrl}/api/stats${endpoint}${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        if (response.status === 401) {
          error.value = { message: 'Authentication expired. Please sign in again.', code: 'AUTH_EXPIRED' }
          authStore.clearAuth()
        } else if (response.status === 403) {
          error.value = { message: 'Access denied', code: 'ACCESS_DENIED' }
        } else {
          const errorData = await response.json().catch(() => ({}))
          error.value = {
            message: errorData.message || 'Failed to fetch statistics',
            code: errorData.code || 'FETCH_ERROR'
          }
        }
        return null
      }

      const data = await response.json()
      return data
    } catch (e) {
      console.error('Error fetching stats:', e)
      error.value = { message: 'An error occurred while fetching statistics', code: 'NETWORK_ERROR' }
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get overview statistics
   */
  const getOverviewStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<StatsOverview | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<StatsOverview>('/overview', params)
  }

  /**
   * Get teams statistics
   */
  const getTeamsStats = async (
    period: StatsPeriod = '30d',
    page: number = 1,
    limit: number = 10
  ): Promise<TeamStats | null> => {
    const params: Record<string, string> = {
      period,
      page: page.toString(),
      limit: limit.toString()
    }
    return await fetchStats<TeamStats>('/teams', params)
  }

  /**
   * Get users statistics
   */
  const getUsersStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<UserStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<UserStats>('/users', params)
  }

  /**
   * Get claims statistics
   */
  const getClaimsStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<ClaimsStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<ClaimsStats>('/claims', params)
  }

  /**
   * Get wages statistics
   */
  const getWagesStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<WagesStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<WagesStats>('/wages', params)
  }

  /**
   * Get expenses statistics
   */
  const getExpensesStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<ExpensesStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<ExpensesStats>('/expenses', params)
  }

  /**
   * Get contracts statistics
   */
  const getContractsStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<ContractsStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<ContractsStats>('/contracts', params)
  }

  /**
   * Get board actions statistics
   */
  const getActionsStats = async (period: StatsPeriod = '30d', teamId?: number): Promise<ActionsStats | null> => {
    const params: Record<string, string> = { period }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<ActionsStats>('/actions', params)
  }

  /**
   * Get recent activity
   */
  const getRecentActivity = async (limit: number = 20, teamId?: number): Promise<RecentActivity | null> => {
    const params: Record<string, string> = { limit: limit.toString() }
    if (teamId) params.teamId = teamId.toString()
    return await fetchStats<RecentActivity>('/activity/recent', params)
  }

  /**
   * Refresh all stats for a specific period
   */
  const refreshAllStats = async (period: StatsPeriod = '30d', teamId?: number) => {
    const results = await Promise.allSettled([
      getOverviewStats(period, teamId),
      getTeamsStats(period),
      getUsersStats(period, teamId),
      getClaimsStats(period, teamId),
      getWagesStats(period, teamId),
      getExpensesStats(period, teamId),
      getContractsStats(period, teamId),
      getActionsStats(period, teamId),
      getRecentActivity(20, teamId)
    ])

    return {
      overview: results[0].status === 'fulfilled' ? results[0].value : null,
      teams: results[1].status === 'fulfilled' ? results[1].value : null,
      users: results[2].status === 'fulfilled' ? results[2].value : null,
      claims: results[3].status === 'fulfilled' ? results[3].value : null,
      wages: results[4].status === 'fulfilled' ? results[4].value : null,
      expenses: results[5].status === 'fulfilled' ? results[5].value : null,
      contracts: results[6].status === 'fulfilled' ? results[6].value : null,
      actions: results[7].status === 'fulfilled' ? results[7].value : null,
      recentActivity: results[8].status === 'fulfilled' ? results[8].value : null
    }
  }

  return {
    isLoading,
    error,
    getOverviewStats,
    getTeamsStats,
    getUsersStats,
    getClaimsStats,
    getWagesStats,
    getExpensesStats,
    getContractsStats,
    getActionsStats,
    getRecentActivity,
    refreshAllStats
  }
}
