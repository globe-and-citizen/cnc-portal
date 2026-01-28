import { useQuery } from '@tanstack/vue-query'
import apiClient from '@/lib/axios'

export interface HealthCheckResponse {
  success: boolean
  status: string
  timestamp: string
  service: string
}

/**
 * Query for backend health check using Axios
 *
 * @endpoint GET /health
 * @params none
 * @queryParams none
 * @body none
 */
export const useBackendHealthQuery = () => {
  return useQuery<HealthCheckResponse>({
    queryKey: ['backend-health'],
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
