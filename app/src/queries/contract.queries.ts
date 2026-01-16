import { useMutation, useQueryClient } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

/**
 * Create a new contract
 */
export const useCreateContractQuery = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contractData: {
      teamId: string
      contractAddress: string
      contractType: string
      deployer: string
    }) => {
      const { data } = await apiClient.post('contract', contractData)
      return data
    },
    onSuccess: () => {
      // Invalidate teams to refresh contract data
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      queryClient.invalidateQueries({ queryKey: ['team'] })
    }
  })
}
