import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Team } from '@/types/team'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'

/**
 * Fetch all teams for a user, for the authenticated user it will be his teams
 */
export const useTeams = () => {
  return useQuery({
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
export const useTeam = (teamId: MaybeRefOrGetter<string | null>) => {
  return useQuery({
    queryKey: ['team', { teamId }],
    queryFn: async () => {
      const id = toValue(teamId)
      if (!id) throw new Error('Team ID is required')
      try {
        const { data } = await apiClient.get<Team>(`teams/${id}`)
        return data
      } catch (error: unknown) {
        // Preserve error status for component usage
        const err = error as { response?: { status: number }; message?: string }
        if (err.response) {
          const enhancedError = new Error(err.message) as Error & { status?: number }
          enhancedError.status = err.response.status
          throw enhancedError
        }
        throw error
      }
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
export const useCreateTeam = () => {
  const queryClient = useQueryClient()

  return useMutation({
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

  return useMutation({
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

  return useMutation({
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
