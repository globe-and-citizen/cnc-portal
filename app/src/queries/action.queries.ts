import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action } from '@/types/action'

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
