import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Wage } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Query key factory for wage-related queries
 */
export const wageKeys = {
  all: ['wages'] as const,
  teams: () => [...wageKeys.all, 'team'] as const,
  team: (teamId: string | number | null) => [...wageKeys.teams(), { teamId }] as const
}

// ============================================================================
// GET /wage/ - Fetch team wages
// ============================================================================

/**
 * Path parameters for GET /wage/ (none for this endpoint)
 */
export interface GetTeamWagesPathParams {}

/**
 * Query parameters for GET /wage/
 */
export interface GetTeamWagesQueryParams {
  /** Team ID */
  teamId: MaybeRefOrGetter<string | number | null>
}

/**
 * Combined parameters for useGetTeamWagesQuery
 */
export interface GetTeamWagesParams {
  pathParams?: GetTeamWagesPathParams
  queryParams: GetTeamWagesQueryParams
}

/**
 * Fetch team wage data by team ID
 *
 * @endpoint GET /wage/
 * @pathParams none
 * @queryParams { teamId: string | number }
 * @body none
 */
export const useGetTeamWagesQuery = (params: GetTeamWagesParams) => {
  const { queryParams } = params

  return useQuery<Wage[], AxiosError>({
    queryKey: wageKeys.team(toValue(queryParams.teamId)),
    queryFn: async () => {
      const teamId = toValue(queryParams.teamId)

      // Query params: passed as URL query string (?teamId=xxx)
      const apiQueryParams: { teamId: string | number } = { teamId: teamId! }

      const { data } = await apiClient.get<Wage[]>('/wage/', { params: apiQueryParams })
      return data
    },
    enabled: () => !!toValue(queryParams.teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

// ============================================================================
// PUT /wage/setWage - Set member wage
// ============================================================================

/**
 * Request body for setting member wage
 */
export interface SetWageBody {
  /** Team ID */
  teamId: string | number
  /** User wallet address */
  userAddress: string
  /** Rate per hour for different token types */
  ratePerHour: Array<{ type: string; amount: number }>
  /** Maximum hours allowed per week */
  maximumHoursPerWeek: number
}

/**
 * Set member wage data for a team
 *
 * @endpoint PUT /wage/setWage
 * @pathParams none
 * @queryParams none
 * @body SetWageBody
 */
export const useSetMemberWageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, SetWageBody>({
    mutationFn: async (body: SetWageBody) => {
      await apiClient.put('/wage/setWage', body)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: wageKeys.team(variables.teamId)
      })
    }
  })
}
