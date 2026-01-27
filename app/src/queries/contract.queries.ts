import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

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
