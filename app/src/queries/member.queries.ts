import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { Member } from '@/types/member'
import type { AxiosError } from 'axios'

/**
 * Query key factory for member-related queries
 */
export const memberKeys = {
  all: ['members'] as const
}

/**
 * Member input type for adding members
 */
export type MemberInput = Array<Pick<Member, 'address' | 'name'>>

/**
 * Path parameters for team member endpoints
 */
export interface TeamMemberPathParams {
  /** Team ID */
  teamId: string | number
}

/**
 * Request body for adding members
 */
export interface AddMembersBody {
  /** Array of members to add */
  members: MemberInput[]
}

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
 * Path parameters for deleting a member
 */
export interface DeleteMemberPathParams {
  /** Team ID */
  teamId: string | number
  /** Member address */
  memberAddress: string
}

/**
 * Add members to a team
 *
 * @endpoint POST /teams/{teamId}/member
 * @params { teamId: string | number } - URL path parameter
 * @queryParams none
 * @body AddMembersBody - array of members to add
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
 * @params DeleteMemberPathParams - URL path parameters
 * @queryParams none
 * @body none
 */
export const useDeleteMemberMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, DeleteMemberPathParams>({
    mutationFn: async ({ teamId, memberAddress }) => {
      await apiClient.delete(`teams/${teamId}/member/${memberAddress}`)
    },
    onSuccess: (_, { teamId }) => {
      queryClient.invalidateQueries({ queryKey: ['team', { teamId: String(teamId) }] })
    }
  })
}
