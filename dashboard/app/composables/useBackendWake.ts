import { useQuery } from '@tanstack/vue-query'

export interface HealthCheckResponse {
  success: boolean
  status: string
  timestamp: string
  service: string
}

/**
 * TanStack Query composable for backend health check
 * Automatically retries and caches the health status
 */
export function useBackendHealth() {
  const runtimeConfig = useRuntimeConfig()
  const backendUrl = runtimeConfig.public.backendUrl
  const healthEndpoint = `${backendUrl}/api/health`

  return useQuery<HealthCheckResponse>({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      try {
        const response = await fetch(healthEndpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error('Health check failed')
        }

        return await response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 180000, // 3 minutes
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false // Disable automatic polling
  })
}

/**
 * Composable to wake up backend on component mount
 * Uses TanStack Query with silent error handling
 * Cache is valid for 3 minutes to reduce redundant calls
 *
 * @example
 * ```vue
 * <script setup>
 * // Wakes backend when component mounts
 * useBackendWake()
 * </script>
 * ```
 */
export function useBackendWake() {
  const { refetch } = useBackendHealth()

  onMounted(() => {
    // Non-blocking wake-up call
    refetch().catch((error) => {
      // Silently fail - this is a background optimization
      console.debug('Backend wake-up ping failed (non-critical):', error)
    })
  })
}
