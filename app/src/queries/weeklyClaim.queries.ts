import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import type { AxiosError } from 'axios'
import type { Address } from 'viem'

/**
 * Weekly Claim Data Types
 */
export interface Claim {
  id: number
  hoursWorked: number
  memo?: string
  dayWorked: string | Date
  status: 'pending' | 'signed' | 'withdrawn' | 'disabled'
  signature?: string | null
  tokenTx?: string | null
  createdAt: string
  updatedAt: string
}

export interface WeeklyClaim {
  id: number
  status: 'pending' | 'signed' | 'withdrawn' | 'disabled'
  weekStart: string | Date
  memberAddress: string
  teamId: number
  claims?: Claim[]
  hoursWorked?: number
  signature?: string | null
  createdAt: string
  updatedAt: string
}

export interface WeeklyClaimWithHours extends WeeklyClaim {
  hoursWorked: number
}

/**
 * Parameters for useTeamWeeklyClaimsQuery
 */
export interface UseTeamWeeklyClaimsQueryParams {
  teamId?: MaybeRefOrGetter<string | number | null>
  userAddress?: MaybeRefOrGetter<Address | undefined>
  status?: MaybeRefOrGetter<'pending' | 'signed' | 'withdrawn' | 'disabled' | undefined>
}

/**
 * Fetch weekly claims for a team with optional filters
 */
export const useTeamWeeklyClaimsQuery = (params: UseTeamWeeklyClaimsQueryParams) => {
  return useQuery<WeeklyClaimWithHours[], AxiosError>({
    queryKey: [
      'teamWeeklyClaims',
      {
        teamId: params.teamId,
        userAddress: params.userAddress,
        status: params.status
      }
    ],
    queryFn: async () => {
      const teamId = toValue(params.teamId)
      const userAddress = toValue(params.userAddress)
      const statusValue = toValue(params.status)

      if (!teamId) throw new Error('Team ID is required')

      let url = `/weeklyClaim/?teamId=${teamId}`
      if (userAddress) {
        url += `&memberAddress=${userAddress}`
      }
      if (statusValue) {
        url += `&status=${statusValue}`
      }

      const { data } = await apiClient.get<WeeklyClaimWithHours[]>(url)
      return data
    },
    enabled: () => !!toValue(params.teamId),
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
 */
export const useWeeklyClaimByIdQuery = (claimId: MaybeRefOrGetter<string | number | null>) => {
  return useQuery<WeeklyClaim, AxiosError>({
    queryKey: ['weeklyClaim', { claimId }],
    queryFn: async () => {
      const id = toValue(claimId)
      if (!id) throw new Error('Claim ID is required')

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
 * Sign a weekly claim
 */
export interface SignWeeklyClaimInput {
  claimId: number | string
  signature: string
}

export const useSignWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, SignWeeklyClaimInput>({
    mutationFn: async (input) => {
      await apiClient.put(`/weeklyClaim/${input.claimId}?action=sign`, {
        signature: input.signature
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate weekly claim query
      queryClient.invalidateQueries({
        queryKey: ['weeklyClaim', { claimId: variables.claimId }]
      })
      // Invalidate team weekly claims
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}

/**
 * Enable a weekly claim (activate for payment)
 */
export interface EnableWeeklyClaimInput {
  claimId: number | string
  signature: string
}

export const useEnableWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, EnableWeeklyClaimInput>({
    mutationFn: async (input) => {
      await apiClient.put(`/weeklyClaim/${input.claimId}?action=enable`, {
        signature: input.signature
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate weekly claim query
      queryClient.invalidateQueries({
        queryKey: ['weeklyClaim', { claimId: variables.claimId }]
      })
      // Invalidate team weekly claims
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}

/**
 * Disable a weekly claim
 */
export interface DisableWeeklyClaimInput {
  claimId: number | string
  signature: string
}

export const useDisableWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, DisableWeeklyClaimInput>({
    mutationFn: async (input) => {
      await apiClient.put(`/weeklyClaim/${input.claimId}?action=disable`, {
        signature: input.signature
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate weekly claim query
      queryClient.invalidateQueries({
        queryKey: ['weeklyClaim', { claimId: variables.claimId }]
      })
      // Invalidate team weekly claims
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}

/**
 * Withdraw a weekly claim
 */
export interface WithdrawWeeklyClaimInput {
  claimId: number | string
  signature: string
}

export const useWithdrawWeeklyClaimMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<void, AxiosError, WithdrawWeeklyClaimInput>({
    mutationFn: async (input) => {
      await apiClient.put(`/weeklyClaim/${input.claimId}?action=withdraw`, {
        signature: input.signature
      })
    },
    onSuccess: (_, variables) => {
      // Invalidate weekly claim query
      queryClient.invalidateQueries({
        queryKey: ['weeklyClaim', { claimId: variables.claimId }]
      })
      // Invalidate team weekly claims
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims']
      })
    }
  })
}

/**
 * Sync weekly claims with blockchain
 */
export interface SyncWeeklyClaimsInput {
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

export const useSyncWeeklyClaimsMutation = () => {
  const queryClient = useQueryClient()
  return useMutation<SyncWeeklyClaimsResponse, AxiosError, SyncWeeklyClaimsInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post<SyncWeeklyClaimsResponse>(
        `/weeklyClaim/sync?teamId=${input.teamId}`
      )
      return data
    },
    onSuccess: (_, variables) => {
      // Invalidate team weekly claims
      queryClient.invalidateQueries({
        queryKey: ['teamWeeklyClaims', { teamId: String(variables.teamId) }]
      })
    }
  })
}
