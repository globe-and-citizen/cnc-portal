import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Wage } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Fetch team wage data by team ID
 *
 * @endpoint GET /wage/
 * @params none
 * @queryParams { teamId: string | number }
 * @body none
 */
export const useTeamWagesQuery = (teamId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<Wage[], AxiosError>({
    queryKey: ['teamWages', { teamId }],
    queryFn: async () => {
      // Query params: passed as URL query string (?teamId=xxx)
      const queryParams = { teamId: toValue(teamId) }

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
 * Mutation input for useSetMemberWageMutation
 * All fields are sent in the request body
 */
export interface SetWageInput {
  teamId: string | number
  userAddress: string
  ratePerHour: Array<{ type: string; amount: number }>
  maximumHoursPerWeek: number
}

/**
 * Set member wage data for a team
 *
 * @endpoint PUT /wage/setWage
 * @params none
 * @queryParams none
 * @body { teamId, userAddress, ratePerHour, maximumHoursPerWeek }
 */
export const useSetMemberWageMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, SetWageInput>({
    mutationFn: async (body: SetWageInput) => {
      await apiClient.put('/wage/setWage', body)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['teamWages', { teamId: String(variables.teamId) }]
      })
    }
  })
}
