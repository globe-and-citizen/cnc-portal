import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Team } from '@/types/team'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'

/**
 * Fetch all teams for a user, for the authenticated user it will be his teams
 */
export const useTeamsQuery = () => {
  return useQuery<Team[], AxiosError>({
    queryKey: ['teams'],
    queryFn: async () => {
      const { data } = await apiClient.get<Team[]>(`teams`)
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
 */
export const useTeamQuery = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery<Team, AxiosError>({
    queryKey: ['team', { teamId }],
    queryFn: async () => {
      const id = toValue(teamId)
      if (!id) throw new Error('Team ID is required')
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
 * Create a new team
 */
export const useCreateTeamQuery = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, Partial<Team>>({
    mutationFn: async (teamData: Partial<Team>) => {
      const { data } = await apiClient.post<Team>('teams', teamData)
      return data
    },
    onSuccess: () => {
      // Invalidate teams list to refetch
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

/**
 * Update an existing team
 */
export const useUpdateTeam = () => {
  const queryClient = useQueryClient()

  return useMutation<Team, AxiosError, { id: string; teamData: Partial<Team> }>({
    mutationFn: async ({ id, teamData }: { id: string; teamData: Partial<Team> }) => {
      const { data } = await apiClient.put<Team>(`teams/${id}`, teamData)
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate specific team and teams list
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(variables.id) }] })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

/**
 * Delete a team
 */
export const useDeleteTeam = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, string>({
    mutationFn: async (teamId: string) => {
      const { data } = await apiClient.delete(`teams/${teamId}`)
      return data
    },
    onSuccess: () => {
      // Invalidate teams list
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}
