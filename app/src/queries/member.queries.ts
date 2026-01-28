import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Member } from '@/types/member'
import type { AxiosError } from 'axios'

export type MemberInput = Array<Pick<Member, 'address' | 'name'>>

/**
 * Mutation input for useAddMembersMutation
 */
export interface AddMembersInput {
  /** URL path parameter: team ID */
  teamId: string | number
  /** Request body: array of members to add */
  members: MemberInput[]
}

/**
 * Mutation input for useDeleteMemberMutation
 */
export interface DeleteMemberInput {
  /** URL path parameter: team ID */
  teamId: string | number
  /** URL path parameter: member address */
  memberAddress: string
}

/**
 * Add members to a team
 *
 * @endpoint POST /teams/{teamId}/member
 * @params { teamId: string | number } - URL path parameter
 * @queryParams none
 * @body MemberInput[] - array of members to add
 */
export const useAddMembersMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<unknown, AxiosError, AddMembersInput>({
    mutationFn: async ({ teamId, members: body }) => {
      const { data } = await apiClient.post<{ members: Member[] }>(`teams/${teamId}/member`, body)
      return data
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(teamId) }] })
    }
  })
}

/**
 * Delete a member from a team
 *
 * @endpoint DELETE /teams/{teamId}/member/{memberAddress}
 * @params { teamId: string | number, memberAddress: string } - URL path parameters
 * @queryParams none
 * @body none
 */
export const useDeleteMemberMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, DeleteMemberInput>({
    mutationFn: async ({ teamId, memberAddress }) => {
      await apiClient.delete(`teams/${teamId}/member/${memberAddress}`)
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(teamId) }] })
    }
  })
}
