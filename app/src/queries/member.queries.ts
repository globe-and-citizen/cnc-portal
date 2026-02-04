import type { Member } from '@/types/member'
import { createMutationHook } from './queryFactory'
import { teamKeys } from './team.queries'

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

// ============================================================================
// POST /teams/{teamId}/member - Add members
// ============================================================================

/**
 * Combined parameters for useAddMembersMutation
 */
export interface AddMembersParams {
  pathParams: {
    /** Team ID */
    teamId: string | number
  }
  body: MemberInput[]
}

/**
 * Add members to a team
 *
 * @endpoint POST /teams/{teamId}/member
 * @pathParams { teamId: string | number }
 * @queryParams none
 * @body MemberInput[] - array of members to add
 */
export const useAddMembersMutation = createMutationHook<{ members: Member[] }, AddMembersParams>({
  method: 'POST',
  endpoint: 'teams/{teamId}/member',
  invalidateKeys: (params) => [teamKeys.detail(String(params.pathParams.teamId))]
})

// ============================================================================
// DELETE /teams/{teamId}/member/{memberAddress} - Delete member
// ============================================================================

/**
 * Combined parameters for useDeleteMemberMutation
 */
export interface DeleteMemberParams {
  pathParams: {
    /** Team ID */
    teamId: string | number
    /** Member address */
    memberAddress: string
  }
}

/**
 * Delete a member from a team
 *
 * @endpoint DELETE /teams/{teamId}/member/{memberAddress}
 * @pathParams { teamId: string | number, memberAddress: string }
 * @queryParams none
 * @body none
 */
export const useDeleteMemberMutation = createMutationHook<void, DeleteMemberParams>({
  method: 'DELETE',
  endpoint: 'teams/{teamId}/member/{memberAddress}',
  invalidateKeys: (params) => [teamKeys.detail(String(params.pathParams.teamId))]
})
