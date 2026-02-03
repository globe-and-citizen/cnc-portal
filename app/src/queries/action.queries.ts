import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Hook parameters for useBodActionsQuery
 */
export interface UseBodActionsQueryParams {
  teamId: MaybeRefOrGetter<string | null>
  isExecuted?: boolean
}

/**
 * Fetch BOD actions for a team
 *
 * @endpoint GET /actions
 * @queryParams { teamId: string, isExecuted?: boolean }
 */
export const useBodActionsQuery = (hookParams: UseBodActionsQueryParams) => {
  return useQuery({
    queryKey: ['getBodActions', { teamId: hookParams.teamId, isExecuted: hookParams.isExecuted }],
    queryFn: async () => {
      const teamId = toValue(hookParams.teamId)

      // Query params: passed as URL query string (?teamId=xxx&isExecuted=xxx)
      const queryParams: Record<string, string | boolean> = { teamId: teamId! }
      if (hookParams.isExecuted !== undefined) {
        queryParams.isExecuted = hookParams.isExecuted
      }

      const { data } = await apiClient.get<ActionResponse>('/actions', { params: queryParams })
      return data
    },
    enabled: () => !!toValue(hookParams.teamId)
  })
}

/**
 * Mutation input for useCreateActionMutation
 */
export type CreateActionInput = Partial<Action>

/**
 * Create a new action
 *
 * @endpoint POST /actions/
 * @body Partial<Action> - The action data to create
 */
export const useCreateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateActionInput) => {
      const { data } = await apiClient.post<Action>('actions/', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
    }
  })
}

/**
 * Mutation input for useUpdateActionMutation
 */
export interface UpdateActionInput {
  /** URL path parameter: action ID */
  id: number
}

/**
 * Update an action
 *
 * @endpoint PATCH /actions/{id}
 * @params { id: number } - URL path parameter
 */
export const useUpdateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: UpdateActionInput) => {
      const { data } = await apiClient.patch(`actions/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getBodActions'] })
    }
  })
}

/**
 * Mutation input for useCreateElectionNotificationsMutation
 */
export interface CreateElectionNotificationsInput {
  /** URL path parameter: team ID */
  teamId: string | number
}

/**
 * Create election notifications for a team
 *
 * @endpoint POST /elections/{teamId}
 * @params { teamId: string | number } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useCreateElectionNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, CreateElectionNotificationsInput>({
    mutationFn: async ({ teamId }) => {
      await apiClient.post(`/elections/${teamId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}
