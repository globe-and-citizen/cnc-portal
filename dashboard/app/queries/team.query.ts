import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import {
  createTeam,
  getAllTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  checkSubmitRestriction,
  addTeamMembers,
  deleteTeamMember
} from '~/api/teams'
import type { CreateTeamPayload, UpdateTeamPayload, AddMembersPayload } from '~/api/teams'

/**
 * Fetch all teams
 */
export const useTeamsQuery = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      return await getAllTeams()
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Fetch a single team by ID
 */
export const useTeamQuery = (id: MaybeRefOrGetter<number>) => {
  return useQuery({
    queryKey: ['team', { id: toValue(id) }],
    queryFn: async () => {
      const teamId = toValue(id)
      return await getTeam(teamId)
    },
    enabled: () => !!toValue(id),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Check submit restriction for a team
 */
export const useTeamSubmitRestrictionQuery = (id: MaybeRefOrGetter<number>) => {
  return useQuery({
    queryKey: ['team', { id: toValue(id) }, 'submit-restriction'],
    queryFn: async () => {
      const teamId = toValue(id)
      return await checkSubmitRestriction(teamId)
    },
    enabled: () => !!toValue(id),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Create a new team
 */
export const useCreateTeamQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (payload: CreateTeamPayload) => {
      return await createTeam(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.add({
        title: 'Success',
        description: 'Team created successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to create team'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Update a team
 */
export const useUpdateTeamQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number, payload: UpdateTeamPayload }) => {
      return await updateTeam(id, payload)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', { id: variables.id }] })
      toast.add({
        title: 'Success',
        description: 'Team updated successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to update team'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Delete a team
 */
export const useDeleteTeamQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (id: number) => {
      return await deleteTeam(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      toast.add({
        title: 'Success',
        description: 'Team deleted successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to delete team'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Add members to a team
 */
export const useAddTeamMembersQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number, payload: AddMembersPayload }) => {
      return await addTeamMembers(id, payload)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', { id: variables.id }] })
      toast.add({
        title: 'Success',
        description: 'Members added successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to add members'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Delete a member from a team
 */
export const useDeleteTeamMemberQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ id, memberAddress }: { id: number, memberAddress: string }) => {
      return await deleteTeamMember(id, memberAddress)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team', { id: variables.id }] })
      toast.add({
        title: 'Success',
        description: 'Member removed successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Failed to remove member'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}
