import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

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
 * @deprecated Use CreateContractBody instead
 */
export type CreateContractInput = CreateContractBody
