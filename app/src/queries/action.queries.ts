import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Parameters for useBodActionsQuery
 */
export interface UseBodActionsQueryParams {
  teamId: MaybeRefOrGetter<string | null>
  isExecuted?: boolean
}

/**
 * Fetch BOD actions for a team
 */
export const useBodActionsQuery = (params: UseBodActionsQueryParams) => {
  return useQuery({
    queryKey: ['getBodActions', { teamId: params.teamId, isExecuted: params.isExecuted }],
    queryFn: async () => {
      const id = toValue(params.teamId)
      if (!id) throw new Error('Team ID is required')
      
      const queryParams: Record<string, string> = { teamId: id }
      if (params.isExecuted !== undefined) {
        queryParams.isExecuted = String(params.isExecuted)
      }
      
      const { data } = await apiClient.get<ActionResponse>('/actions', { params: queryParams })
      return data
    },
    enabled: () => !!toValue(params.teamId)
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
