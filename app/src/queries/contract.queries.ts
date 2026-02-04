import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'
import type { AxiosError } from 'axios'

/**
 * Query key factory for contract-related queries
 */
export const contractKeys = {
  all: ['contracts'] as const
}

/**
 * Request body for creating a contract
 */
export interface CreateContractBody {
  /** Team ID this contract belongs to */
  teamId: string
  /** Smart contract address */
  contractAddress: string
  /** Type of contract (e.g., "BoardOfDirectors", "ExpenseAccountEIP712") */
  contractType: string
  /** Address of the deployer */
  deployer: string
}

/**
 * Create a new contract
 *
 * @endpoint POST /contract
 * @params none
 * @queryParams none
 * @body CreateContractBody
 */
export const useCreateContractMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateContractBody) => {
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
 * Request body for syncing contracts
 */
export interface SyncContractsBody {
  /** Team ID */
  teamId: string
}

/**
 * Sync contracts for a team
 *
 * @endpoint PUT /contract/sync
 * @params none
 * @queryParams none
 * @body SyncContractsBody
 */
export const useSyncContractsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, SyncContractsBody>({
    mutationFn: async ({ teamId }) => {
      await apiClient.put('contract/sync', { teamId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}

/**
 * Request body for resetting contracts
 */
export interface ResetContractsBody {
  /** Team ID */
  teamId: string
}

/**
 * Reset/delete contracts for a team
 *
 * @endpoint DELETE /contract/reset
 * @params none
 * @queryParams none
 * @body ResetContractsBody
 */
export const useResetContractsMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<void, AxiosError, ResetContractsBody>({
    mutationFn: async ({ teamId }) => {
      await apiClient.delete('contract/reset', { data: { teamId } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractKeys.all })
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}

/**
 * @deprecated Use CreateContractBody instead
 */
export type CreateContractInput = CreateContractBody

/**
 * @deprecated Use SyncContractsBody instead
 */
export type SyncContractsInput = SyncContractsBody

/**
 * @deprecated Use ResetContractsBody instead
 */
export type ResetContractsInput = ResetContractsBody
