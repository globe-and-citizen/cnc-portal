import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'
import type { Address } from 'viem'
import type { WeeklyClaim } from '@/types/cash-remuneration'

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
 * Path parameters for GET /weeklyClaim/ (none for this endpoint)
 */
export interface GetTeamWeeklyClaimsPathParams {}

/**
 * Query parameters for GET /weeklyClaim/
 */
export interface GetTeamWeeklyClaimsQueryParams {
  /** Team ID */
  teamId?: MaybeRefOrGetter<string | number | null>
  /** Optional member address filter */
  userAddress?: MaybeRefOrGetter<Address | undefined>
  /** Optional status filter */
  status?: MaybeRefOrGetter<'pending' | 'signed' | 'withdrawn' | 'disabled' | undefined>
}

/**
 * Combined parameters for useGetTeamWeeklyClaimsQuery
 */
export interface GetTeamWeeklyClaimsParams {
  pathParams?: GetTeamWeeklyClaimsPathParams
  queryParams: GetTeamWeeklyClaimsQueryParams
}

/**
 * Fetch weekly claims for a team with optional filters
 *
 * @endpoint GET /weeklyClaim/
 * @pathParams none
 * @queryParams { teamId: string | number, memberAddress?: string, status?: string }
 * @body none
 */
export const useGetTeamWeeklyClaimsQuery = (params: GetTeamWeeklyClaimsParams) => {
  const { queryParams } = params

  return useQuery<WeeklyClaim[], AxiosError>({
    queryKey: weeklyClaimKeys.team(
      toValue(queryParams.teamId),
      toValue(queryParams.userAddress),
      toValue(queryParams.status)
    ),
    queryFn: async () => {
      const teamId = toValue(queryParams.teamId)
      const userAddress = toValue(queryParams.userAddress)
      const statusValue = toValue(queryParams.status)

      // Query params: passed as URL query string (?teamId=xxx&memberAddress=xxx&status=xxx)
      const apiQueryParams: { teamId: string | number; memberAddress?: string; status?: string } = {
        teamId: teamId!
      }
      if (userAddress) {
        apiQueryParams.memberAddress = userAddress
      }
      if (statusValue) {
        apiQueryParams.status = statusValue
      }

      const { data } = await apiClient.get<WeeklyClaim[]>('/weeklyClaim/', {
        params: apiQueryParams
      })
      return data
    },
    enabled: () => !!toValue(queryParams.teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

// ============================================================================
// GET /weeklyClaim/{claimId} - Fetch single weekly claim
// ============================================================================

/**
 * Path parameters for GET /weeklyClaim/{claimId}
 */
export interface GetWeeklyClaimByIdPathParams {
  /** Claim ID */
  claimId: MaybeRefOrGetter<string | number | null>
}

/**
 * Query parameters for GET /weeklyClaim/{claimId} (none for this endpoint)
 */
export interface GetWeeklyClaimByIdQueryParams {}

/**
 * Combined parameters for useGetWeeklyClaimByIdQuery
 */
export interface GetWeeklyClaimByIdParams {
  pathParams: GetWeeklyClaimByIdPathParams
  queryParams?: GetWeeklyClaimByIdQueryParams
}

/**
 * Fetch a single weekly claim by ID
 *
 * @endpoint GET /weeklyClaim/{claimId}
 * @pathParams { claimId: string | number }
 * @queryParams none
 * @body none
 */
export const useGetWeeklyClaimByIdQuery = (params: GetWeeklyClaimByIdParams) => {
  const { pathParams } = params

  return useQuery<WeeklyClaim, AxiosError>({
    queryKey: weeklyClaimKeys.detail(toValue(pathParams.claimId)),
    queryFn: async () => {
      const id = toValue(pathParams.claimId)

      const { data } = await apiClient.get<WeeklyClaim>(`/weeklyClaim/${id}`)
      return data
    },
    enabled: () => !!toValue(pathParams.claimId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

// ============================================================================
// PUT /weeklyClaim/{claimId} - Update weekly claim
// ============================================================================

/**
 * Weekly claim action types for PUT /weeklyClaim/{claimId}
 */
export type WeeklyClaimAction = 'sign' | 'enable' | 'disable' | 'withdraw'

/**
 * Path parameters for PUT /weeklyClaim/{claimId}
 */
export interface UpdateWeeklyClaimPathParams {
  /** Claim ID */
  claimId: number | string
}

/**
 * Query parameters for PUT /weeklyClaim/{claimId}
 */
export interface UpdateWeeklyClaimQueryParams {
  /** Action to perform */
  action: WeeklyClaimAction
}

/**
 * Request body for PUT /weeklyClaim/{claimId}
 */
export interface UpdateWeeklyClaimBody {
  /** Signature (required only for 'sign' action) */
  signature?: string
}

/**
 * Combined parameters for useUpdateWeeklyClaimMutation
 */
export interface UpdateWeeklyClaimParams {
  pathParams: UpdateWeeklyClaimPathParams
  queryParams: UpdateWeeklyClaimQueryParams
  body?: UpdateWeeklyClaimBody
}

/**
 * Update a weekly claim (sign, enable, disable, or withdraw)
 *
 * @endpoint PUT /weeklyClaim/{claimId}
 * @pathParams { claimId: number | string }
 * @queryParams { action: WeeklyClaimAction }
 * @body { signature?: string } - Required only for 'sign' action
 */
export const useUpdateWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, UpdateWeeklyClaimParams>({
    mutationFn: async (params: UpdateWeeklyClaimParams) => {
      const { pathParams, queryParams, body } = params
      const apiQueryParams = { action: queryParams.action }
      const apiBody = body?.signature ? { signature: body.signature } : {}

      await apiClient.put(`/weeklyClaim/${pathParams.claimId}`, apiBody, {
        params: apiQueryParams
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.detail(variables.pathParams.claimId)
      })
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.teams()
      })
    }
  })
}

// ============================================================================
// POST /weeklyClaim/sync - Sync weekly claims
// ============================================================================

/**
 * Query parameters for POST /weeklyClaim/sync
 */
export interface SyncWeeklyClaimsQueryParams {
  /** Team ID */
  teamId: number | string
}

/**
 * Combined parameters for useSyncWeeklyClaimsMutation
 */
export interface SyncWeeklyClaimsParams {
  queryParams: SyncWeeklyClaimsQueryParams
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
export const useSyncWeeklyClaimsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<SyncWeeklyClaimsResponse, AxiosError, SyncWeeklyClaimsParams>({
    mutationFn: async (params: SyncWeeklyClaimsParams) => {
      const { queryParams } = params
      const apiQueryParams = { teamId: queryParams.teamId }
      const { data } = await apiClient.post<SyncWeeklyClaimsResponse>(
        '/weeklyClaim/sync',
        {},
        {
          params: apiQueryParams
        }
      )
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.team(variables.queryParams.teamId, undefined, undefined)
      })
    }
  })
}

// ============================================================================
// DELETE /claim/{claimId} - Delete claim
// ============================================================================

/**
 * Path parameters for DELETE /claim/{claimId}
 */
export interface DeleteClaimPathParams {
  /** Claim ID */
  claimId: number | string
}

/**
 * Combined parameters for useDeleteClaimMutation
 */
export interface DeleteClaimParams {
  pathParams: DeleteClaimPathParams
}

/**
 * Delete a claim
 *
 * @endpoint DELETE /claim/{claimId}
 * @pathParams { claimId: number | string }
 * @queryParams none
 * @body none
 */
export const useDeleteClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, DeleteClaimParams>({
    mutationFn: async (params: DeleteClaimParams) => {
      const { pathParams } = params
      await apiClient.delete(`/claim/${pathParams.claimId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.teams()
      })
    }
  })
}
