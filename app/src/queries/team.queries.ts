import type { Team } from '@/types/team'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

/**
 * Query key factory for team-related queries
 */
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (userAddress?: string | null) => [...teamKeys.lists(), { userAddress }] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (teamId: string | null) => [...teamKeys.details(), { teamId }] as const
}

// ============================================================================
// GET /teams - Fetch teams list
// GET /teams/?userAddress=xxx - Fetch teams list
// ============================================================================

/**
 * Combined parameters for useGetTeamsQuery
 */
export interface GetTeamsParams {
  queryParams?: {
    /** Optional user address to filter teams */
    userAddress?: MaybeRefOrGetter<string | null | undefined>
  }
}

/**
 * Fetch all teams for a user, for the authenticated user it will be his teams
 *
 * @endpoint GET /teams
 * @pathParams none
 * @queryParams { userAddress?: string } - optional filter by user address
 * @body none
 */
export const useGetTeamsQuery = createQueryHook<
  Team[],
  GetTeamsParams
>({
  endpoint: 'teams',
  queryKey: (params) => teamKeys.list(toValue(params?.queryParams?.userAddress)),
  options: queryPresets.stable
})

// ============================================================================
// GET /teams/{teamId} - Fetch single team
// ============================================================================

/**
 * Combined parameters for useGetTeamQuery
 */
export interface GetTeamParams {
  pathParams: {
    /** Team ID */
    teamId: MaybeRefOrGetter<string | null>
  }
}

/**
 * Fetch a single team by ID
 *
 * @endpoint GET /teams/{teamId}
 * @pathParams { teamId: string }
 * @queryParams none
 * @body none
 */
export const useGetTeamQuery = createQueryHook<
  Team,
  GetTeamParams
>({
  endpoint: 'teams/{teamId}',
  queryKey: (params) => teamKeys.detail(toValue(params.pathParams.teamId)),
  enabled: (params) => !!toValue(params.pathParams.teamId),
  options: {
    ...queryPresets.stable,
    retry: false
  }
})

// ============================================================================
// POST /teams - Create team
// ============================================================================

/**
 * Request body for creating a team
 */
export interface CreateTeamBody extends Partial<Team> {}

/**
 * Combined parameters for useCreateTeamMutation
 */
export interface CreateTeamParams {
  body: CreateTeamBody
}

/**
 * Create a new team
 *
 * @endpoint POST /teams
 * @pathParams none
 * @queryParams none
 * @body CreateTeamBody - team data to create
 */
export const useCreateTeamMutation = createMutationHook<
  Team,
  CreateTeamParams
>({
  method: 'POST',
  endpoint: 'teams',
  invalidateKeys: [teamKeys.all]
})

// ============================================================================
// PUT /teams/{id} - Update team
// ============================================================================

/**
 * Request body for updating a team
 */
export interface UpdateTeamBody extends Partial<Team> {}

/**
 * Combined parameters for useUpdateTeamMutation
 */
export interface UpdateTeamParams {
  pathParams: {
    /** Team ID */
    id: string
  }
  body: UpdateTeamBody
}

/**
 * Update an existing team
 *
 * @endpoint PUT /teams/{id}
 * @pathParams { id: string }
 * @queryParams none
 * @body UpdateTeamBody - team data to update
 */
export const useUpdateTeamMutation = createMutationHook<
  Team,
  UpdateTeamParams
>({
  method: 'PUT',
  endpoint: 'teams/{id}',
  invalidateKeys: (params) => [teamKeys.detail(params.pathParams.id), teamKeys.all]
})

// ============================================================================
// DELETE /teams/{teamId} - Delete team
// ============================================================================

/**
 * Combined parameters for useDeleteTeamMutation
 */
export interface DeleteTeamParams {
  pathParams: {
    /** Team ID */
    teamId: string
  }
}

/**
 * Delete a team
 *
 * @endpoint DELETE /teams/{teamId}
 * @pathParams { teamId: string }
 * @queryParams none
 * @body none
 */
export const useDeleteTeamMutation = createMutationHook<
  void,
  DeleteTeamParams
>({
  method: 'DELETE',
  endpoint: 'teams/{teamId}',
  invalidateKeys: [teamKeys.all]
})

// ============================================================================
// GET /teams/{teamId}/submit-restriction - Check submit restriction
// ============================================================================

/**
 * Response type for submit restriction query
 */
export interface SubmitRestrictionResponse {
  isRestricted: boolean
  effectiveStatus: string
}

/**
 * Combined parameters for useGetSubmitRestrictionQuery
 */
export interface GetSubmitRestrictionParams {
  pathParams: {
    /** Team ID */
    teamId: MaybeRefOrGetter<string | number | null>
  }
}

/**
 * Check submit restriction status for a team
 *
 * @endpoint GET /teams/{teamId}/submit-restriction
 * @pathParams { teamId: string | number }
 * @queryParams none
 * @body none
 */
export const useGetSubmitRestrictionQuery = createQueryHook<
  SubmitRestrictionResponse,
  GetSubmitRestrictionParams
>({
  endpoint: 'teams/{teamId}/submit-restriction',
  queryKey: (params) => [
    ...teamKeys.detail(String(toValue(params.pathParams.teamId))),
    'submitRestriction'
  ],
  enabled: (params) => !!toValue(params.pathParams.teamId),
  options: {
    ...queryPresets.moderate,
    retry: false,
    refetchOnMount: true
  }
})
