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

/**
 * Query parameters for fetching team weekly claims
 */
export interface TeamWeeklyClaimsQueryParams {
  /** Team ID */
  teamId: string | number
  /** Optional member address filter */
  memberAddress?: string
  /** Optional status filter */
  status?: 'pending' | 'signed' | 'withdrawn' | 'disabled'
}

/**
 * Hook parameters for useGetTeamWeeklyClaimsQuery
 */
export interface UseGetTeamWeeklyClaimsQueryParams {
  teamId?: MaybeRefOrGetter<string | number | null>
  userAddress?: MaybeRefOrGetter<Address | undefined>
  status?: MaybeRefOrGetter<'pending' | 'signed' | 'withdrawn' | 'disabled' | undefined>
}

/**
 * Path parameters for weekly claim endpoints
 */
export interface WeeklyClaimPathParams {
  /** Claim ID */
  claimId: number | string
}

/**
 * Fetch weekly claims for a team with optional filters
 *
 * @endpoint GET /weeklyClaim/
 * @params none
 * @queryParams TeamWeeklyClaimsQueryParams
 * @body none
 */
export const useGetTeamWeeklyClaimsQuery = (hookParams: UseGetTeamWeeklyClaimsQueryParams) => {
  return useQuery<WeeklyClaim[], AxiosError>({
    queryKey: weeklyClaimKeys.team(
      toValue(hookParams.teamId),
      toValue(hookParams.userAddress),
      toValue(hookParams.status)
    ),
    queryFn: async () => {
      const teamId = toValue(hookParams.teamId)
      const userAddress = toValue(hookParams.userAddress)
      const statusValue = toValue(hookParams.status)

      // Query params: passed as URL query string (?teamId=xxx&memberAddress=xxx&status=xxx)
      const queryParams: TeamWeeklyClaimsQueryParams = { teamId: teamId! }
      if (userAddress) {
        queryParams.memberAddress = userAddress
      }
      if (statusValue) {
        queryParams.status = statusValue
      }

      const { data } = await apiClient.get<WeeklyClaim[]>('/weeklyClaim/', { params: queryParams })
      return data
    },
    enabled: () => !!toValue(hookParams.teamId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Fetch a single weekly claim by ID
 *
 * @endpoint GET /weeklyClaim/{claimId}
 * @params WeeklyClaimPathParams - URL path parameter
 * @queryParams none
 * @body none
 */
export const useGetWeeklyClaimByIdQuery = (claimId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<WeeklyClaim, AxiosError>({
    queryKey: weeklyClaimKeys.detail(toValue(claimId)),
    queryFn: async () => {
      const id = toValue(claimId)

      const { data } = await apiClient.get<WeeklyClaim>(`/weeklyClaim/${id}`)
      return data
    },
    enabled: () => !!toValue(claimId),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Weekly claim action types for PUT /weeklyClaim/{claimId}
 */
export type WeeklyClaimAction = 'sign' | 'enable' | 'disable' | 'withdraw'

/**
 * Query parameters for updating weekly claim
 */
export interface UpdateWeeklyClaimQueryParams {
  /** Action to perform */
  action: WeeklyClaimAction
}

/**
 * Request body for updating weekly claim (sign action)
 */
export interface UpdateWeeklyClaimBody {
  /** Signature (required only for 'sign' action) */
  signature?: string
}

/**
 * Mutation input for useUpdateWeeklyClaimMutation
 */
export interface UpdateWeeklyClaimInput {
  /** URL path parameter: claim ID */
  claimId: number | string
  /** Query parameter: action to perform */
  action: WeeklyClaimAction
  /** Request body: signature (required only for 'sign' action) */
  signature?: string
}

/**
 * Update a weekly claim (sign, enable, disable, or withdraw)
 *
 * @endpoint PUT /weeklyClaim/{claimId}
 * @params WeeklyClaimPathParams - URL path parameter
 * @queryParams UpdateWeeklyClaimQueryParams
 * @body UpdateWeeklyClaimBody - Required only for 'sign' action
 */
export const useUpdateWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, UpdateWeeklyClaimInput>({
    mutationFn: async ({ claimId, action, signature }) => {
      // Query params: ?action=xxx
      const queryParams: UpdateWeeklyClaimQueryParams = { action }
      // Body: signature data (only included if provided)
      const body: UpdateWeeklyClaimBody = signature ? { signature } : {}

      await apiClient.put(`/weeklyClaim/${claimId}`, body, { params: queryParams })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.detail(variables.claimId)
      })
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.teams()
      })
    }
  })
}

/**
 * Query parameters for syncing weekly claims
 */
export interface SyncWeeklyClaimsQueryParams {
  /** Team ID */
  teamId: number | string
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
 * @params none
 * @queryParams SyncWeeklyClaimsQueryParams
 * @body {} (empty object)
 */
export const useSyncWeeklyClaimsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<SyncWeeklyClaimsResponse, AxiosError, SyncWeeklyClaimsQueryParams>({
    mutationFn: async ({ teamId }) => {
      // Query params: ?teamId=xxx
      const queryParams: SyncWeeklyClaimsQueryParams = { teamId }
      const { data } = await apiClient.post<SyncWeeklyClaimsResponse>(
        '/weeklyClaim/sync',
        {},
        {
          params: queryParams
        }
      )
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: weeklyClaimKeys.team(variables.teamId, undefined, undefined)
      })
    }
  })
}

/**
 * @deprecated Use useGetTeamWeeklyClaimsQuery instead
 */
export const useTeamWeeklyClaimsQuery = useGetTeamWeeklyClaimsQuery

/**
 * @deprecated Use UseGetTeamWeeklyClaimsQueryParams instead
 */
export type UseTeamWeeklyClaimsQueryParams = UseGetTeamWeeklyClaimsQueryParams

/**
 * @deprecated Use useGetWeeklyClaimByIdQuery instead
 */
export const useWeeklyClaimByIdQuery = useGetWeeklyClaimByIdQuery

/**
 * @deprecated Use SyncWeeklyClaimsQueryParams instead
 */
export type SyncWeeklyClaimsInput = SyncWeeklyClaimsQueryParams
