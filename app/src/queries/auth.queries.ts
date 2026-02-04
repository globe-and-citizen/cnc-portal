import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

/**
 * Query key factory for auth-related queries
 */
export const authKeys = {
  all: ['auth'] as const,
  validateToken: () => [...authKeys.all, 'validateToken'] as const
}

/**
 * Validate the current authentication token
 *
 * @endpoint GET /auth/token
 * @params none
 * @queryParams none
 * @body none
 */
export const useGetValidateTokenQuery = () => {
  return useQuery({
    queryKey: authKeys.validateToken(),
    queryFn: async () => {
      const { data } = await apiClient.get('auth/token')
      return data
    },
    // Don't automatically refetch for token validation
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    refetchInterval: false,
    staleTime: Infinity
  })
}
