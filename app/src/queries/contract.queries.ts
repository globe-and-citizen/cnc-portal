import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { AxiosError } from 'axios'

/**
 * Mutation input for useCreateContractMutation
 */
export interface CreateContractInput {
  teamId: string
  contractAddress: string
  contractType: string
  deployer: string
}

/**
 * Create a new contract
 *
 * @endpoint POST /contract
 * @params none
 * @queryParams none
 * @body { teamId, contractAddress, contractType, deployer }
 */
export const useCreateContractMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateContractInput) => {
      const { data } = await apiClient.post('contract', body)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}

/**
 * Mutation input for useSyncContractsMutation
 */
export interface SyncContractsInput {
  /** Request body: team ID */
  teamId: string
}

/**
 * Sync contracts for a team
 *
 * @endpoint PUT /contract/sync
 * @params none
 * @queryParams none
 * @body { teamId: string }
 */
export const useSyncContractsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, SyncContractsInput>({
    mutationFn: async ({ teamId }) => {
      await apiClient.put('contract/sync', { teamId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}

/**
 * Mutation input for useResetContractsMutation
 */
export interface ResetContractsInput {
  /** Request body: team ID */
  teamId: string
}

/**
 * Reset/delete contracts for a team
 *
 * @endpoint DELETE /contract/reset
 * @params none
 * @queryParams none
 * @body { teamId: string }
 */
export const useResetContractsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, ResetContractsInput>({
    mutationFn: async ({ teamId }) => {
      await apiClient.delete('contract/reset', { data: { teamId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}
