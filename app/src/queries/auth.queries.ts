import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

/**
 * Validate the current authentication token
 */
export const useValidateToken = () => {
  return useQuery({
    queryKey: ['auth', 'validateToken'],
    queryFn: async () => {
      const { data } = await apiClient.get('auth/token')
      return data
    },
    // Don't automatically refetch for token validation
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: false,
    staleTime: Infinity,
  })
}
