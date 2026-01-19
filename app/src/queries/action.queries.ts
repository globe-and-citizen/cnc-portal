import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Fetch actions for a team
 */
export const useActionsQuery = (
  teamId: MaybeRefOrGetter<string | number | null>,
  isExecuted?: MaybeRefOrGetter<boolean | null>
) => {
  return useQuery<ActionResponse, AxiosError>({
    queryKey: ['getBodActions', { teamId, isExecuted }],
    queryFn: async () => {
      const id = toValue(teamId)
      const executed = toValue(isExecuted)
      if (!id) throw new Error('Team ID is required')

      let url = `/actions?teamId=${id}`
      if (executed !== null && executed !== undefined) {
        url += `&isExecuted=${executed}`
      }

      const { data } = await apiClient.get<ActionResponse>(url)
      return data
    },
    enabled: () => !!toValue(teamId),
    refetchOnWindowFocus: true
  })
}

/**
 * Create a new action
 */
export const useCreateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (actionData: Partial<Action>) => {
      const { data } = await apiClient.post('actions/', actionData)
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
