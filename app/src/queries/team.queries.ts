import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Team } from '@/types/team'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

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
export const useTeamsQuery = (userAddress?: MaybeRefOrGetter<string | null | undefined>) => {
  return useQuery<Team[], AxiosError>({
    queryKey: ['teams', { userAddress }],
    queryFn: async () => {
      const address = toValue(userAddress)
      // Query params: passed as URL query string (?userAddress=xxx)
      const queryParams = address ? { userAddress: address } : {}

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
export const useTeamQuery = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery<Team, AxiosError>({
    queryKey: ['team', { teamId }],
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
 * Mutation input for useCreateTeamMutation
 */
export type CreateTeamInput = Partial<Team>

/**
 * Create a new team
 *
 * @endpoint POST /teams
 * @params none
 * @queryParams none
 * @body Partial<Team> - team data to create
 */
export const useCreateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, CreateTeamInput>({
    mutationFn: async (body: CreateTeamInput) => {
      const { data } = await apiClient.post<Team>('teams', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
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
 * Update an existing team
 *
 * @endpoint PUT /teams/{id}
 * @params { id: string } - URL path parameter
 * @queryParams none
 * @body Partial<Team> - team data to update
 */
export const useUpdateTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, UpdateTeamInput>({
    mutationFn: async ({ id, teamData: body }: UpdateTeamInput) => {
      const { data } = await apiClient.put<Team>(`teams/${id}`, body)
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(variables.id) }] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

/**
 * Mutation input for useDeleteTeamMutation
 */
export interface DeleteTeamInput {
  /** URL path parameter: team ID */
  teamId: string
}

/**
 * Delete a team
 *
 * @endpoint DELETE /teams/{teamId}
 * @params { teamId: string } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useDeleteTeamMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, DeleteTeamInput>({
    mutationFn: async ({ teamId }) => {
      const { data } = await apiClient.delete(`teams/${teamId}`)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}
