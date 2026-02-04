import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Team } from '@/types/team'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

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
// ============================================================================

/**
 * Path parameters for GET /teams (none for this endpoint)
 */
export interface GetTeamsPathParams {}

/**
 * Query parameters for GET /teams
 */
export interface GetTeamsQueryParams {
  /** Optional user address to filter teams */
  userAddress?: MaybeRefOrGetter<string | null | undefined>
}

/**
 * Combined parameters for useGetTeamsQuery
 */
export interface GetTeamsParams {
  pathParams?: GetTeamsPathParams
  queryParams?: GetTeamsQueryParams
}

/**
 * Fetch all teams for a user, for the authenticated user it will be his teams
 *
 * @endpoint GET /teams
 * @pathParams none
 * @queryParams { userAddress?: string } - optional filter by user address
 * @body none
 */
export const useGetTeamsQuery = (params?: GetTeamsParams) => {
  const userAddress = params?.queryParams?.userAddress

  return useQuery<Team[], AxiosError>({
    queryKey: teamKeys.list(toValue(userAddress)),
    queryFn: async () => {
      const address = toValue(userAddress)
      // Query params: passed as URL query string (?userAddress=xxx)
      const apiQueryParams: { userAddress?: string } = address ? { userAddress: address } : {}

      const { data } = await apiClient.get<Team[]>('teams', { params: apiQueryParams })
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

// ============================================================================
// GET /teams/{teamId} - Fetch single team
// ============================================================================

/**
 * Path parameters for GET /teams/{teamId}
 */
export interface GetTeamPathParams {
  /** Team ID */
  teamId: MaybeRefOrGetter<string | null>
}

/**
 * Query parameters for GET /teams/{teamId} (none for this endpoint)
 */
export interface GetTeamQueryParams {}

/**
 * Combined parameters for useGetTeamQuery
 */
export interface GetTeamParams {
  pathParams: GetTeamPathParams
  queryParams?: GetTeamQueryParams
}

/**
 * Fetch a single team by ID
 *
 * @endpoint GET /teams/{teamId}
 * @pathParams { teamId: string }
 * @queryParams none
 * @body none
 */
export const useGetTeamQuery = (params: GetTeamParams) => {
  const { pathParams } = params

  return useQuery<Team, AxiosError>({
    queryKey: teamKeys.detail(toValue(pathParams.teamId)),
    queryFn: async () => {
      const id = toValue(pathParams.teamId)
      const { data } = await apiClient.get<Team>(`teams/${id}`)
      return data
    },
    enabled: () => !!toValue(pathParams.teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

// ============================================================================
// POST /teams - Create team
// ============================================================================

/**
 * Request body for creating a team
 */
export interface CreateTeamBody extends Partial<Team> {}

/**
 * Create a new team
 *
 * @endpoint POST /teams
 * @pathParams none
 * @queryParams none
 * @body CreateTeamBody - team data to create
 */
export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, CreateTeamBody>({
    mutationFn: async (body: CreateTeamBody) => {
      const { data } = await apiClient.post<Team>('teams', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    }
  })
}

// ============================================================================
// PUT /teams/{id} - Update team
// ============================================================================

/**
 * Path parameters for PUT /teams/{id}
 */
export interface UpdateTeamPathParams {
  /** Team ID */
  id: string
}

/**
 * Request body for updating a team
 */
export interface UpdateTeamBody extends Partial<Team> {}

/**
 * Combined parameters for useUpdateTeamMutation
 */
export interface UpdateTeamParams {
  pathParams: UpdateTeamPathParams
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
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, UpdateTeamParams>({
    mutationFn: async (params: UpdateTeamParams) => {
      const { pathParams, body } = params
      const { data } = await apiClient.put<Team>(`teams/${pathParams.id}`, body)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.pathParams.id) })
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    }
  })
}

// ============================================================================
// DELETE /teams/{teamId} - Delete team
// ============================================================================

/**
 * Path parameters for DELETE /teams/{teamId}
 */
export interface DeleteTeamPathParams {
  /** Team ID */
  teamId: string
}

/**
 * Combined parameters for useDeleteTeamMutation
 */
export interface DeleteTeamParams {
  pathParams: DeleteTeamPathParams
}

/**
 * Delete a team
 *
 * @endpoint DELETE /teams/{teamId}
 * @pathParams { teamId: string }
 * @queryParams none
 * @body none
 */
export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, DeleteTeamParams>({
    mutationFn: async (params: DeleteTeamParams) => {
      const { pathParams } = params
      const { data } = await apiClient.delete(`teams/${pathParams.teamId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    }
  })
}

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
 * Path parameters for GET /teams/{teamId}/submit-restriction
 */
export interface GetSubmitRestrictionPathParams {
  /** Team ID */
  teamId: MaybeRefOrGetter<string | number | null>
}

/**
 * Query parameters for GET /teams/{teamId}/submit-restriction (none for this endpoint)
 */
export interface GetSubmitRestrictionQueryParams {}

/**
 * Combined parameters for useGetSubmitRestrictionQuery
 */
export interface GetSubmitRestrictionParams {
  pathParams: GetSubmitRestrictionPathParams
  queryParams?: GetSubmitRestrictionQueryParams
}

/**
 * Check submit restriction status for a team
 *
 * @endpoint GET /teams/{teamId}/submit-restriction
 * @pathParams { teamId: string | number }
 * @queryParams none
 * @body none
 */
export const useGetSubmitRestrictionQuery = (params: GetSubmitRestrictionParams) => {
  const { pathParams } = params

  return useQuery<SubmitRestrictionResponse, AxiosError>({
    queryKey: [...teamKeys.detail(String(toValue(pathParams.teamId))), 'submitRestriction'],
    queryFn: async () => {
      const id = toValue(pathParams.teamId)
      const { data } = await apiClient.get<SubmitRestrictionResponse>(
        `teams/${id}/submit-restriction`
      )
      return data
    },
    enabled: () => !!toValue(pathParams.teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    staleTime: 60000, // 1 minute - shorter for real-time accuracy
    gcTime: 120000
  })
}
