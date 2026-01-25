import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Fetch BOD actions for a team
 */
export const useBodActionsQuery = (
  teamId: MaybeRefOrGetter<string | null>,
  isExecuted?: boolean
) => {
  return useQuery({
    queryKey: ['getBodActions', { teamId, isExecuted }],
    queryFn: async () => {
      const id = toValue(teamId)
      if (!id) throw new Error('Team ID is required')
      const params = new URLSearchParams({ teamId: id })
      if (isExecuted !== undefined) {
        params.append('isExecuted', String(isExecuted))
      }
      const { data } = await apiClient.get<ActionResponse>(`/actions?${params.toString()}`)
      return data
    },
    enabled: () => !!toValue(teamId)
  })
}

/**
 * Create a new action
 */
export const useCreateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionData: Partial<Action>) => {
      const { data } = await apiClient.post<Action>('actions/', actionData)
      return data
    },
    onSuccess: () => {
      // Invalidate actions queries
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
    }
  })
}

/**
 * Update an action
 */
export const useUpdateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`actions/${id}`)
      return data
    },
    onSuccess: () => {
      // Invalidate actions queries
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
    }
  })
}
