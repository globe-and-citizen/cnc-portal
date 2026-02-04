import { createQueryHook, queryPresets } from './queryFactory'

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

// ============================================================================
// GET /health - Backend health check
// ============================================================================

/**
 * Empty params for useGetBackendHealthQuery (no parameters needed)
 */
 
export interface GetBackendHealthParams {}

/**
 * Query for backend health check using Axios
 *
 * @endpoint GET /health
 * @pathParams none
 * @queryParams none
 * @body none
 */
export const useGetBackendHealthQuery = createQueryHook<HealthCheckResponse, GetBackendHealthParams>(
  {
    endpoint: 'health',
    queryKey: () => healthKeys.backend(),
    options: {
      ...queryPresets.once,
      retry: 2,
      gcTime: 300000 // 5 minutes
    }
  }
)
