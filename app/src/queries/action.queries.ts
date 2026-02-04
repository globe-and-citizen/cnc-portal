import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Query key factory for action-related queries
 */
export const actionKeys = {
  all: ['actions'] as const,
  lists: () => [...actionKeys.all, 'list'] as const,
  list: (teamId: string | null, isExecuted?: boolean) =>
    [...actionKeys.lists(), { teamId, isExecuted }] as const
}

/**
 * Query parameters for listing BOD actions
 */
export interface BodActionsQueryParams {
  /** Team ID to filter actions */
  teamId?: string
  /** Filter by execution status */
  isExecuted?: boolean
}

/**
 * Hook parameters for useGetBodActionsQuery
 */
export interface UseGetBodActionsQueryParams {
  teamId: MaybeRefOrGetter<string | null>
  isExecuted?: boolean
}

/**
 * @deprecated Use UseGetBodActionsQueryParams instead
 */
export type UseBodActionsQueryParams = UseGetBodActionsQueryParams

/**
 * Fetch BOD actions for a team
 *
 * @endpoint GET /actions
 * @queryParams { teamId: string, isExecuted?: boolean }
 */
export const useGetBodActionsQuery = (hookParams: UseGetBodActionsQueryParams) => {
  return useQuery({
    queryKey: actionKeys.list(toValue(hookParams.teamId), hookParams.isExecuted),
    queryFn: async () => {
      const teamId = toValue(hookParams.teamId)

      // Query params: passed as URL query string (?teamId=xxx&isExecuted=xxx)
      const queryParams: BodActionsQueryParams = { teamId: teamId! }
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
 * Request body for creating an action
 */
export interface CreateActionBody extends Partial<Action> {}

/**
 * Create a new action
 *
 * @endpoint POST /actions/
 * @body CreateActionBody - The action data to create
 */
export const useCreateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateActionBody) => {
      const { data } = await apiClient.post<Action>('actions/', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all })
    }
  })
}

/**
 * Path parameters for action endpoints
 */
export interface ActionPathParams {
  /** Action ID */
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
    mutationFn: async ({ id }: ActionPathParams) => {
      const { data } = await apiClient.patch(`actions/${id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all })
    }
  })
}

/**
 * Path parameters for election notifications endpoint
 */
export interface ElectionNotificationsPathParams {
  /** Team ID */
  teamId: string | number
}

/**
 * Create election notifications for a team
 *
 * @endpoint POST /elections/{teamId}
 * @params ElectionNotificationsPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useCreateElectionNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, ElectionNotificationsPathParams>({
    mutationFn: async ({ teamId }) => {
      await apiClient.post(`/elections/${teamId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}

/**
 * @deprecated Use useGetBodActionsQuery instead
 */
export const useBodActionsQuery = useGetBodActionsQuery

/**
 * @deprecated Use ElectionNotificationsPathParams instead
 */
export type CreateElectionNotificationsInput = ElectionNotificationsPathParams
