import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Wage } from '@/types'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Fetch team wage data by team ID
 */
export const useTeamWagesQuery = (teamId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<Wage[], AxiosError>({
    queryKey: ['teamWages', { teamId }],
    queryFn: async () => {
      const id = toValue(teamId)
      if (!id) throw new Error('Team ID is required')
      const { data } = await apiClient.get<Wage[]>(`/wage/?teamId=${id}`)
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
 */
export interface SetWageInput {
  teamId: string | number
  userAddress: string
  ratePerHour: Array<{ type: string; amount: number }>
  maximumHoursPerWeek: number
}

export const useSetMemberWageQuery = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, SetWageInput>({
    mutationFn: async (wageInput) => {
      await apiClient.put('/wage/setWage', {
        teamId: wageInput.teamId,
        userAddress: wageInput.userAddress,
        ratePerHour: wageInput.ratePerHour,
        maximumHoursPerWeek: wageInput.maximumHoursPerWeek
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate wage queries to refetch
      queryClient.invalidateQueries({
        queryKey: ['teamWages', { teamId: String(variables.teamId) }]
      })
    }
  })
}
