import type { Action, ActionResponse } from '@/types/action'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

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
 * Combined parameters for useGetBodActionsQuery
 */
export interface GetBodActionsParams {
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
export const useGetBodActionsQuery = createQueryHook<ActionResponse, GetBodActionsParams>({
  endpoint: 'actions',
  queryKey: (params) =>
    actionKeys.list(toValue(params.queryParams.teamId), toValue(params.queryParams.isExecuted)),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  options: queryPresets.moderate
})

// ============================================================================
// POST /actions/ - Create action
// ============================================================================

/**
 * Request body for creating an action
 */
export interface CreateActionBody extends Partial<Action> {}

/**
 * Combined parameters for useCreateActionMutation
 */
export interface CreateActionParams {
  body: CreateActionBody
}

/**
 * Create a new action
 *
 * @endpoint POST /actions/
 * @pathParams none
 * @queryParams none
 * @body CreateActionBody - The action data to create
 */
export const useCreateActionMutation = createMutationHook<Action, CreateActionParams>({
  method: 'POST',
  endpoint: 'actions/',
  invalidateKeys: [actionKeys.all]
})

// ============================================================================
// PATCH /actions/{id} - Update action
// ============================================================================

/**
 * Combined parameters for useUpdateActionMutation
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
export const useUpdateActionMutation = createMutationHook<void, UpdateActionParams>({
  method: 'PATCH',
  endpoint: 'actions/{id}',
  invalidateKeys: [actionKeys.all]
})

// ============================================================================
// POST /elections/{teamId} - Create election notifications
// ============================================================================

/**
 * Combined parameters for useCreateElectionNotificationsMutation
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
export const useCreateElectionNotificationsMutation = createMutationHook<
  void,
  CreateElectionNotificationsParams
>({
  method: 'POST',
  endpoint: 'elections/{teamId}',
  invalidateKeys: [['notifications']]
})
