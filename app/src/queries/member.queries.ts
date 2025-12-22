import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Member } from '@/types/member'
import type { AxiosError } from 'axios'

export type MemberInput = Array<Pick<Member, 'address' | 'name'>>
/**
 * Add members to a team
 */
export const useAddMembers = (teamId: string | number) => {
  const queryClient = useQueryClient()

  return useMutation<{ members: Member[] }, AxiosError, MemberInput[]>({
    mutationFn: async (members: MemberInput[]) => {
      const { data } = await apiClient.post<{ members: Member[] }>(
        `teams/${teamId}/member`,
        members
      )
      return data
    },
    onSuccess: () => {
      // Invalidate team data to refetch with updated members
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(teamId) }] })
      // queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

/**
 * Delete a member from a team
 */
export const useDeleteMember = (teamId: string | number, memberAddress: string) => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, void>({
    mutationFn: async () => {
      await apiClient.delete(`teams/${teamId}/member/${memberAddress}`)
    },
    onSuccess: () => {
      // Invalidate team data to refetch with updated members
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(teamId) }] })
      // queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}
