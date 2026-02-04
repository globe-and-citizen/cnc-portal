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

/**
 * Query parameters for fetching teams
 */
export interface TeamsQueryParams {
  /** Optional user address to filter teams */
  userAddress?: string
}

/**
 * Path parameters for team endpoints
 */
export interface TeamPathParams {
  /** Team ID */
  teamId: string
}

/**
 * Fetch all teams for a user, for the authenticated user it will be his teams
 *
 * @endpoint GET /teams
 * @params none
 * @queryParams { userAddress?: string } - optional filter by user address
 * @body none
 *
 * @param userAddress - Optional user address to filter teams by specific user
 */
export const useGetTeamsQuery = (userAddress?: MaybeRefOrGetter<string | null | undefined>) => {
  return useQuery<Team[], AxiosError>({
    queryKey: teamKeys.list(toValue(userAddress)),
    queryFn: async () => {
      const address = toValue(userAddress)
      // Query params: passed as URL query string (?userAddress=xxx)
      const queryParams: TeamsQueryParams = address ? { userAddress: address } : {}

      const { data } = await apiClient.get<Team[]>('teams', { params: queryParams })
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Fetch a single team by ID
 *
 * @endpoint GET /teams/{teamId}
 * @params { teamId: string } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useGetTeamQuery = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery<Team, AxiosError>({
    queryKey: teamKeys.detail(toValue(teamId)),
    queryFn: async () => {
      const id = toValue(teamId)
      const { data } = await apiClient.get<Team>(`teams/${id}`)
      return data
    },
    enabled: () => !!toValue(teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Request body for creating a team
 */
export interface CreateTeamBody extends Partial<Team> {}

/**
 * Create a new team
 *
 * @endpoint POST /teams
 * @params none
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

/**
 * Mutation input for useUpdateTeamMutation
 */
export interface UpdateTeamInput {
  /** URL path parameter: team ID */
  id: string
  /** Request body: team data to update */
  teamData: Partial<Team>
}

/**
 * Request body for updating a team
 */
export interface UpdateTeamBody extends Partial<Team> {}

/**
 * Update an existing team
 *
 * @endpoint PUT /teams/{id}
 * @params { id: string } - URL path parameter
 * @queryParams none
 * @body UpdateTeamBody - team data to update
 */
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, UpdateTeamInput>({
    mutationFn: async ({ id, teamData: body }: UpdateTeamInput) => {
      const { data } = await apiClient.put<Team>(`teams/${id}`, body)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    }
  })
}

/**
 * Path parameters for deleting a team
 */
export interface DeleteTeamPathParams {
  /** Team ID */
  teamId: string
}

/**
 * Delete a team
 *
 * @endpoint DELETE /teams/{teamId}
 * @params DeleteTeamPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, DeleteTeamPathParams>({
    mutationFn: async ({ teamId }) => {
      const { data } = await apiClient.delete(`teams/${teamId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })
    }
  })
}

/**
 * Response type for submit restriction query
 */
export interface SubmitRestrictionResponse {
  isRestricted: boolean
  effectiveStatus: string
}

/**
 * Check submit restriction status for a team
 *
 * @endpoint GET /teams/{teamId}/submit-restriction
 * @params TeamPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useGetSubmitRestrictionQuery = (
  teamId: MaybeRefOrGetter<string | number | null>
) => {
  return useQuery<SubmitRestrictionResponse, AxiosError>({
    queryKey: [...teamKeys.detail(String(toValue(teamId))), 'submitRestriction'],
    queryFn: async () => {
      const id = toValue(teamId)
      const { data } = await apiClient.get<SubmitRestrictionResponse>(
        `teams/${id}/submit-restriction`
      )
      return data
    },
    enabled: () => !!toValue(teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false,
    staleTime: 60000, // 1 minute - shorter for real-time accuracy
    gcTime: 120000
  })
}

/**
 * @deprecated Use useGetTeamsQuery instead
 */
export const useTeamsQuery = useGetTeamsQuery

/**
 * @deprecated Use useGetTeamQuery instead
 */
export const useTeamQuery = useGetTeamQuery

/**
 * @deprecated Use DeleteTeamPathParams instead
 */
export type DeleteTeamInput = DeleteTeamPathParams

/**
 * @deprecated Use useGetSubmitRestrictionQuery instead
 */
export const useSubmitRestrictionQuery = useGetSubmitRestrictionQuery
