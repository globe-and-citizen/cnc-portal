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

// ============================================================================
// GET /actions - Fetch BOD actions
// ============================================================================

/**
 * Parameters for useGetBodActionsQuery
 */
export interface GetBodActionsParams {
  pathParams?: {}
  queryParams: {
    /** Team ID to filter actions */
    teamId: MaybeRefOrGetter<string | null>
    /** Filter by execution status */
    isExecuted?: MaybeRefOrGetter<boolean | undefined>
  }
}

/**
 * Fetch BOD actions for a team
 *
 * @endpoint GET /actions
 * @pathParams none
 * @queryParams { teamId: string, isExecuted?: boolean }
 * @body none
 */
export const useGetBodActionsQuery = (params: GetBodActionsParams) => {
  const { queryParams } = params

  return useQuery({
    queryKey: actionKeys.list(toValue(queryParams.teamId), toValue(queryParams.isExecuted)),
    queryFn: async () => {
      const teamId = toValue(queryParams.teamId)
      const isExecuted = toValue(queryParams.isExecuted)

      // Query params: passed as URL query string (?teamId=xxx&isExecuted=xxx)
      const apiQueryParams: { teamId: string; isExecuted?: boolean } = { teamId: teamId! }
      if (isExecuted !== undefined) {
        apiQueryParams.isExecuted = isExecuted
      }

      const { data } = await apiClient.get<ActionResponse>('/actions', { params: apiQueryParams })
      return data
    },
    enabled: () => !!toValue(queryParams.teamId)
  })
}

// ============================================================================
// POST /actions/ - Create action
// ============================================================================

/**
 * Request body for creating an action
 */
export interface CreateActionBody extends Partial<Action> {}

/**
 * Create a new action
 *
 * @endpoint POST /actions/
 * @pathParams none
 * @queryParams none
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

// ============================================================================
// PATCH /actions/{id} - Update action
// ============================================================================

/**
 * Parameters for useUpdateActionMutation
 */
export interface UpdateActionParams {
  pathParams: {
    /** Action ID */
    id: number
  }
}

/**
 * Update an action
 *
 * @endpoint PATCH /actions/{id}
 * @pathParams { id: number }
 * @queryParams none
 * @body none
 */
export const useUpdateActionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: UpdateActionParams) => {
      const { pathParams } = params
      const { data } = await apiClient.patch(`actions/${pathParams.id}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: actionKeys.all })
    }
  })
}

// ============================================================================
// POST /elections/{teamId} - Create election notifications
// ============================================================================

/**
 * Parameters for useCreateElectionNotificationsMutation
 */
export interface CreateElectionNotificationsParams {
  pathParams: {
    /** Team ID */
    teamId: string | number
  }
}

/**
 * Create election notifications for a team
 *
 * @endpoint POST /elections/{teamId}
 * @pathParams { teamId: string | number }
 * @queryParams none
 * @body none
 */
export const useCreateElectionNotificationsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, CreateElectionNotificationsParams>({
    mutationFn: async (params: CreateElectionNotificationsParams) => {
      const { pathParams } = params
      await apiClient.post(`/elections/${pathParams.teamId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })
}
