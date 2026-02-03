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

/**
 * Query parameters for fetching team wages
 */
export interface TeamWagesQueryParams {
  /** Team ID */
  teamId: string | number
}

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
 * Fetch team wage data by team ID
 *
 * @endpoint GET /wage/
 * @params none
 * @queryParams { teamId: string | number }
 * @body none
 */
export const useGetTeamWagesQuery = (teamId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<Wage[], AxiosError>({
    queryKey: wageKeys.team(toValue(teamId)),
    queryFn: async () => {
      // Query params: passed as URL query string (?teamId=xxx)
      const queryParams: TeamWagesQueryParams = { teamId: toValue(teamId)! }

      const { data } = await apiClient.get<Wage[]>('/wage/', { params: queryParams })
      return data
    },
    enabled: () => !!toValue(teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Set member wage data for a team
 *
 * @endpoint PUT /wage/setWage
 * @params none
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

/**
 * @deprecated Use useGetTeamWagesQuery instead
 */
export const useTeamWagesQuery = useGetTeamWagesQuery

/**
 * @deprecated Use SetWageBody instead
 */
export type SetWageInput = SetWageBody
