import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'
import type { Address } from 'viem'
import type { WeeklyClaim } from '@/types/cash-remuneration'

/**
 * Hook parameters for useTeamWeeklyClaimsQuery
 */
export interface UseTeamWeeklyClaimsQueryParams {
  teamId?: MaybeRefOrGetter<string | number | null>
  userAddress?: MaybeRefOrGetter<Address | undefined>
  status?: MaybeRefOrGetter<'pending' | 'signed' | 'withdrawn' | 'disabled' | undefined>
}

/**
 * Fetch weekly claims for a team with optional filters
 *
 * @endpoint GET /weeklyClaim/
 * @params none
 * @queryParams { teamId: string | number, memberAddress?: string, status?: string }
 * @body none
 */
export const useTeamWeeklyClaimsQuery = (hookParams: UseTeamWeeklyClaimsQueryParams) => {
  return useQuery<WeeklyClaim[], AxiosError>({
    queryKey: [
      'teamWeeklyClaims',
      {
        teamId: hookParams.teamId,
        userAddress: hookParams.userAddress,
        status: hookParams.status
      }
    ],
    queryFn: async () => {
      const teamId = toValue(hookParams.teamId)
      const userAddress = toValue(hookParams.userAddress)
      const statusValue = toValue(hookParams.status)

      // Query params: passed as URL query string (?teamId=xxx&memberAddress=xxx&status=xxx)
      const queryParams: Record<string, string | number> = { teamId: teamId! }
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
 * @params { claimId: string | number } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useWeeklyClaimByIdQuery = (claimId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<WeeklyClaim, AxiosError>({
    queryKey: ['weeklyClaim', { claimId }],
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
 * @params { claimId: number | string } - URL path parameter
 * @queryParams { action: 'sign' | 'enable' | 'disable' | 'withdraw' }
 * @body { signature?: string } - Required only for 'sign' action
 */
export const useUpdateWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, UpdateWeeklyClaimInput>({
    mutationFn: async ({ claimId, action, signature }) => {
      // Query params: ?action=xxx
      const queryParams = { action }
      // Body: signature data (only included if provided)
      const body = signature ? { signature } : {}

      await apiClient.put(`/weeklyClaim/${claimId}`, body, { params: queryParams })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['weeklyClaim', { claimId: variables.claimId }]
      })
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}

/**
 * Mutation input for useSyncWeeklyClaimsMutation
 */
export interface SyncWeeklyClaimsInput {
  /** Query parameter: team ID */
  teamId: number | string
}

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
 * @queryParams { teamId: number | string }
 * @body {} (empty object)
 */
export const useSyncWeeklyClaimsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<SyncWeeklyClaimsResponse, AxiosError, SyncWeeklyClaimsInput>({
    mutationFn: async ({ teamId }) => {
      // Query params: ?teamId=xxx
      const queryParams = { teamId }
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
        queryKey: ['teamWeeklyClaims', { teamId: String(variables.teamId) }]
      })
    }
  })
}

/**
 * Mutation input for useDeleteClaimMutation
 */
export interface DeleteClaimInput {
  /** URL path parameter: claim ID */
  claimId: number | string
}

/**
 * Delete a claim
 *
 * @endpoint DELETE /claim/{claimId}
 * @params { claimId: number | string } - URL path parameter
 * @queryParams none
 * @body none
 */
export const useDeleteClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, DeleteClaimInput>({
    mutationFn: async ({ claimId }) => {
      await apiClient.delete(`/claim/${claimId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}
