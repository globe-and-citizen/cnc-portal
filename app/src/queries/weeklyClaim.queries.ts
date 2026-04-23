import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { Address } from 'viem'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Claim, FileAttachment, WeeklyClaim } from '@/types/cash-remuneration'
import type { ClaimSubmitPayload } from '@/types'
import apiClient from '@/lib/axios'
import { uploadFileApi } from '@/api'
import { createQueryHook, createMutationHook, queryPresets } from './queryFactory'

type ClaimResponse = Omit<Claim, 'minutesWorked'> & { minutesWorked?: number | null }
type WeeklyClaimResponse = Omit<WeeklyClaim, 'minutesWorked' | 'claims'> & {
  minutesWorked?: number | null
  claims: ClaimResponse[]
}

const getClaimWorkedMinutes = ({
  minutesWorked
}: {
  minutesWorked?: number | null
}) => minutesWorked ?? 0

export const normalizeClaimResponse = (claim: ClaimResponse): Claim => {
  const workedMinutes = getClaimWorkedMinutes(claim)

  return {
    ...claim,
    minutesWorked: workedMinutes
  }
}

export const normalizeWeeklyClaimResponse = (weeklyClaim: WeeklyClaimResponse): WeeklyClaim => {
  const claims = weeklyClaim.claims.map(normalizeClaimResponse)
  const totalWorkedMinutes =
    weeklyClaim.minutesWorked ?? claims.reduce((sum, claim) => sum + claim.minutesWorked, 0)

  return {
    ...weeklyClaim,
    claims,
    minutesWorked: totalWorkedMinutes
  }
}

/**
 * Query key factory for weekly claim-related queries
 */
export const weeklyClaimKeys = {
  all: ['weeklyClaims'] as const,
  teams: () => [...weeklyClaimKeys.all, 'team'] as const,
  team: (teamId: string | number | null | undefined, userAddress?: Address, status?: string) =>
    [...weeklyClaimKeys.teams(), { teamId, userAddress, status }] as const,
  details: () => [...weeklyClaimKeys.all, 'detail'] as const,
  detail: (claimId: string | number | null | undefined) =>
    [...weeklyClaimKeys.details(), { claimId }] as const
}

// ============================================================================
// GET /weeklyClaim/ - Fetch team weekly claims
// ============================================================================

/**
 * Combined parameters for useGetTeamWeeklyClaimsQuery
 */
export interface GetTeamWeeklyClaimsParams {
  queryParams: {
    /** Team ID */
    teamId?: MaybeRefOrGetter<string | number | null>
    /** Optional member address filter */
    userAddress?: MaybeRefOrGetter<Address | undefined>
    /** Optional status filter */
    status?: MaybeRefOrGetter<'pending' | 'signed' | 'withdrawn' | 'disabled' | undefined>
  }
}

/**
 * Fetch weekly claims for a team with optional filters
 *
 * @endpoint GET /weeklyClaim/
 * @pathParams none
 * @queryParams { teamId: string | number, memberAddress?: string, status?: string }
 * @body none
 */
export const useGetTeamWeeklyClaimsQuery = createQueryHook<
  WeeklyClaim[],
  GetTeamWeeklyClaimsParams
>({
  endpoint: 'weeklyClaim/',
  queryKey: (params) =>
    weeklyClaimKeys.team(
      toValue(params.queryParams.teamId),
      toValue(params.queryParams.userAddress),
      toValue(params.queryParams.status)
    ),
  enabled: (params) => !!toValue(params.queryParams.teamId),
  transformResponse: (data) => (data as WeeklyClaimResponse[]).map(normalizeWeeklyClaimResponse),
  options: {
    ...queryPresets.stable,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  }
})

// ============================================================================
// GET /weeklyClaim/{claimId} - Fetch single weekly claim
// ============================================================================

/**
 * Combined parameters for useGetWeeklyClaimByIdQuery
 */
export interface GetWeeklyClaimByIdParams {
  pathParams: {
    /** Claim ID */
    claimId: MaybeRefOrGetter<string | number | null>
  }
}

/**
 * Fetch a single weekly claim by ID
 *
 * @endpoint GET /weeklyClaim/{claimId}
 * @pathParams { claimId: string | number }
 * @queryParams none
 * @body none
 */
export const useGetWeeklyClaimByIdQuery = createQueryHook<WeeklyClaim, GetWeeklyClaimByIdParams>({
  endpoint: (params) => `weeklyClaim/${toValue(params.pathParams.claimId)}`,
  queryKey: (params) => weeklyClaimKeys.detail(toValue(params.pathParams.claimId)),
  enabled: (params) => !!toValue(params.pathParams.claimId),
  transformResponse: (data) => normalizeWeeklyClaimResponse(data as WeeklyClaimResponse),
  options: {
    ...queryPresets.stable,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  }
})

// ============================================================================
// PUT /weeklyClaim/{claimId} - Update weekly claim
// ============================================================================

/**
 * Weekly claim action types for PUT /weeklyClaim/{claimId}
 */
export type WeeklyClaimAction = 'sign' | 'enable' | 'disable' | 'withdraw'

/**
 * Combined parameters for useUpdateWeeklyClaimMutation
 */
export interface UpdateWeeklyClaimParams {
  pathParams: {
    /** Claim ID */
    claimId: number | string
  }
  queryParams: {
    /** Action to perform */
    action: WeeklyClaimAction
  }
  body?: {
    /** Signature (required only for 'sign' action) */
    signature?: string
  }
}

/**
 * Update a weekly claim (sign, enable, disable, or withdraw)
 *
 * @endpoint PUT /weeklyClaim/{claimId}
 * @pathParams { claimId: number | string }
 * @queryParams { action: WeeklyClaimAction }
 * @body { signature?: string } - Required only for 'sign' action
 */
export const useUpdateWeeklyClaimMutation = createMutationHook<void, UpdateWeeklyClaimParams>({
  method: 'PUT',
  endpoint: 'weeklyClaim/{claimId}',
  invalidateKeys: (params) => [
    weeklyClaimKeys.detail(params.pathParams.claimId),
    weeklyClaimKeys.teams()
  ]
})

// ============================================================================
// POST /weeklyClaim/sync - Sync weekly claims
// ============================================================================

/**
 * Combined parameters for useSyncWeeklyClaimsMutation
 */
export interface SyncWeeklyClaimsParams {
  queryParams: {
    /** Team ID */
    teamId: number | string
  }
}

/**
 * Response from syncing weekly claims
 */
export interface SyncWeeklyClaimsResponse {
  teamId: number
  totalProcessed: number
  updated: Array<{
    id: number
    previousStatus: string
    newStatus: string
  }>
  skipped: Array<{
    id: number
    reason: string
  }>
}

/**
 * Sync weekly claims with blockchain
 *
 * @endpoint POST /weeklyClaim/sync
 * @pathParams none
 * @queryParams { teamId: number | string }
 * @body {} (empty object)
 */
export const useSyncWeeklyClaimsMutation = createMutationHook<
  SyncWeeklyClaimsResponse,
  SyncWeeklyClaimsParams
>({
  method: 'POST',
  endpoint: 'weeklyClaim/sync',
  invalidateKeys: (params) => [
    weeklyClaimKeys.team(params.queryParams.teamId, undefined, undefined)
  ]
})

// ============================================================================
// DELETE /claim/{claimId} - Delete claim
// ============================================================================

/**
 * Combined parameters for useDeleteClaimMutation
 */
export interface DeleteClaimParams {
  pathParams: {
    /** Claim ID */
    claimId: number | string
  }
}

/**
 * Delete a claim
 *
 * @endpoint DELETE /claim/{claimId}
 * @pathParams { claimId: number | string }
 * @queryParams none
 * @body none
 */
export const useDeleteClaimMutation = createMutationHook<void, DeleteClaimParams>({
  method: 'DELETE',
  endpoint: 'claim/{claimId}',
  invalidateKeys: [weeklyClaimKeys.teams()]
})

// ============================================================================
// POST /claim - Submit claim
// ============================================================================

export interface SubmitClaimParams extends ClaimSubmitPayload {
  teamId: string | number
  files?: File[]
}

export const useSubmitClaimMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, SubmitClaimParams>({
    mutationKey: ['submit-claim'],
    mutationFn: async (payload) => {
      const attachments: FileAttachment[] = []

      if (payload.files && payload.files.length > 0) {
        const uploadedFiles = await uploadFileApi(payload.files)
        attachments.push(
          ...uploadedFiles.files.map((data) => ({
            fileKey: data.fileKey,
            fileUrl: data.fileUrl,
            fileType: data.metadata.fileType,
            fileSize: data.metadata.fileSize
          }))
        )
      }

      await apiClient.post('/claim', {
        teamId: payload.teamId.toString(),
        minutesWorked: payload.minutesWorked.toString(),
        memo: payload.memo,
        dayWorked: payload.dayWorked,
        attachments: attachments.length > 0 ? attachments : undefined
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: weeklyClaimKeys.teams() })
    }
  })
}

export interface EditClaimWithFilesParams extends ClaimSubmitPayload {
  claimId: number | string
  deletedFileIndexes?: number[]
  files?: File[]
}

export const useEditClaimWithFilesMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, Error, EditClaimWithFilesParams>({
    mutationKey: ['edit-claim-with-files'],
    mutationFn: async (payload) => {
      const attachments: FileAttachment[] = []

      if (payload.files && payload.files.length > 0) {
        const uploadedFiles = await uploadFileApi(payload.files)
        attachments.push(
          ...uploadedFiles.files.map((data) => ({
            fileKey: data.fileKey,
            fileUrl: data.fileUrl,
            fileType: data.metadata.fileType,
            fileSize: data.metadata.fileSize
          }))
        )
      }

      try {
        await apiClient.put(`/claim/${payload.claimId}`, {
          minutesWorked: payload.minutesWorked.toString(),
          memo: payload.memo,
          dayWorked: payload.dayWorked,
          deletedFileIndexes:
            payload.deletedFileIndexes && payload.deletedFileIndexes.length > 0
              ? payload.deletedFileIndexes
              : undefined,
          attachments: attachments.length > 0 ? attachments : undefined
        })
      } catch (error) {
        const backendMessage = (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message
        throw new Error(backendMessage ?? 'Failed to update claim')
      }
    },
    onSuccess: async (_, payload) => {
      await queryClient.invalidateQueries({ queryKey: weeklyClaimKeys.teams() })
      await queryClient.invalidateQueries({ queryKey: weeklyClaimKeys.detail(payload.claimId) })
    }
  })
}

// ============================================================================
// PUT /claim/{claimId} - Edit claim
// ============================================================================

/**
 * Combined parameters for useEditClaimMutation
 */
export interface EditClaimParams {
  pathParams: {
    /** Claim ID */
    claimId: number | string
  }
  body: {
    /** Minutes worked */
    minutesWorked: string
    /** Claim memo */
    memo: string
    /** ISO date string */
    dayWorked: string
    /** Original indexes to remove from existing attachments */
    deletedFileIndexes?: number[]
    /** Newly uploaded attachments metadata */
    attachments?: FileAttachment[]
  }
}

/**
 * Edit an existing claim
 *
 * @endpoint PUT /claim/{claimId}
 * @pathParams { claimId: number | string }
 * @queryParams none
 * @body { minutesWorked: string, memo: string, dayWorked: string, deletedFileIndexes?: number[], attachments?: FileAttachment[] }
 */
export const useEditClaimMutation = createMutationHook<void, EditClaimParams>({
  method: 'PUT',
  endpoint: 'claim/{claimId}',
  invalidateKeys: [weeklyClaimKeys.teams()]
})
