import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

/**
 * Response from backend health check
 */
export interface HealthCheckResponse {
  success: boolean
  status: string
  timestamp: string
  service: string
}

/**
 * Query key factory for health-related queries
 */
export const healthKeys = {
  all: ['health'] as const,
  backend: () => [...healthKeys.all, 'backend'] as const
}

/**
 * Query for backend health check using Axios
 *
 * @endpoint GET /health
 * @params none
 * @queryParams none
 * @body none
 */
export const useGetBackendHealthQuery = () => {
  return useQuery<HealthCheckResponse>({
    queryKey: healthKeys.backend(),
    queryFn: async () => {
      const { data } = await apiClient.get('health')
      return data
    },
    retry: 2,
    retryDelay: 1000,
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false, // Disable automatic polling
    staleTime: Infinity
  })
}
