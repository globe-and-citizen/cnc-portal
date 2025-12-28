import axios from 'axios'
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosRequestHeaders
} from 'axios'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { BACKEND_URL } from '~/constant/index'

/**
 * Create a configured axios instance.
 * Uses Nuxt runtime config via BACKEND_URL helper, with sensible defaults.
 */
function createApiClient(): AxiosInstance {
  return axios.create({
    baseURL: `${BACKEND_URL}/api/`,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

export const apiClient = createApiClient()

/**
 * Request interceptor: attach Bearer token from AuthStore (preferred)
 * and fallback to localStorage if store is not available yet.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token: string | null = null
    try {
      const authStore = useAuthStore()
      token = authStore.getToken()
    } catch {
      // Pinia not ready (early import or SSR context) – fallback
      token
        = typeof localStorage !== 'undefined'
          ? localStorage.getItem('dashboard-auth-token')
          : null
    }

    if (token) {
      const headers = (config.headers ?? {}) as AxiosRequestHeaders
      headers.Authorization = `Bearer ${token}`
      config.headers = headers
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

/**
 * Base response interceptor: lightweight handling/logging.
 * For full auth flows (redirects), use setupAuthInterceptor(router).
 */
apiClient.interceptors.response.use(
  response => response,
  (error) => {
    if (error.response?.status === 401) {
      // Keep minimal global handling; pages/queries can decide specifics
      console.warn('Unauthorized request detected')
    }
    return Promise.reject(error)
  }
)

/**
 * Optional router-aware interceptor with richer handling.
 * Call once in app initialization (e.g., a Nuxt plugin).
 */
export const setupAuthInterceptor = (router: Router) => {
  apiClient.interceptors.response.use(
    response => response,
    async (error) => {
      if (error.response?.status === 401) {
        console.warn(
          'Unauthorized (401) – clearing auth and redirecting to login'
        )
        try {
          const authStore = useAuthStore()
          authStore.clearAuth()
        } catch {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('dashboard-auth-token')
            localStorage.removeItem('dashboard-auth-address')
          }
        }
        try {
          await router.push({ name: 'login' })
        } catch (e) {
          console.warn('Router push failed, using window navigation', e)
          window.location.href = '/login'
        }
      }

      if (error.response?.status === 403) {
        console.warn('Access forbidden (403) – insufficient permissions')
        try {
          await router.push({ name: 'index' })
        } catch {
          // no-op if routing fails
        }
      }

      if (error.response?.status === 404) {
        console.warn('Resource not found (404)')
      }

      if (error.response?.status === 500) {
        console.error('Server error (500)', error.response.data)
      }

      if (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') {
        console.error('Network error – timeout or connection refused', error)
      }

      return Promise.reject(error)
    }
  )
}

/**
 * Get the configured axios instance.
 */
export const getApiClient = (): AxiosInstance => apiClient

// ========================================
// Features Management
// ========================================

export type FeatureStatus = 'enabled' | 'disabled' | 'beta'

export interface Feature {
  id?: number
  functionName?: string
  status?: FeatureStatus
}

export interface FeatureWithOverrides extends Feature {
  functionName: string
  overrides?: Array<{
    teamId: number
    teamName: string
    status: FeatureStatus
  }>
}

export interface TeamRestrictionOverride {
  teamId: number
  teamName: string
  status: FeatureStatus
}

export const FEATURE_STATUS_OPTIONS = [
  { label: 'Enabled', value: 'enabled' as const },
  { label: 'Disabled', value: 'disabled' as const },
  { label: 'Beta', value: 'beta' as const }
]

/**
 * Fetch feature data with all overrides (generic for any feature)
 * @param featureName The name of the feature (e.g., 'SUBMIT_RESTRICTION')
 */
export async function fetchFeatureRestrictions(
  featureName: string
): Promise<FeatureWithOverrides> {
  try {
    const { data } = await apiClient.get<{
      success: boolean
      data: FeatureWithOverrides
    }>(`admin/features/${featureName}`)

    return data.data
  } catch (error) {
    console.error(`Error fetching ${featureName} feature:`, error)
    throw error
  }
}

/**
 * Update global restriction setting (generic for any feature)
 * @param featureName The name of the feature
 * @param status The new status
 */
export async function updateGlobalFeatureRestriction(
  featureName: string,
  status: FeatureStatus
): Promise<boolean> {
  try {
    const { data } = await apiClient.put<{ success: boolean }>(
      `admin/features/${featureName}`,
      { status }
    )

    return data.success
  } catch (error) {
    console.error(`Error updating ${featureName} restriction:`, error)
    throw error
  }
}

/**
 * Create a team override for a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 * @param status The restriction status
 */
export async function createFeatureTeamOverride(
  featureName: string,
  teamId: number,
  status: FeatureStatus
): Promise<boolean> {
  try {
    const { data } = await apiClient.post<{ success: boolean }>(
      `admin/features/${featureName}/teams/${teamId}`,
      { status }
    )

    return data.success
  } catch (error) {
    console.error(`Error creating ${featureName} team override:`, error)
    throw error
  }
}

/**
 * Update a team override for a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 * @param status The new restriction status
 */
export async function updateFeatureTeamOverride(
  featureName: string,
  teamId: number,
  status: FeatureStatus
): Promise<boolean> {
  try {
    const { data } = await apiClient.put<{ success: boolean }>(
      `admin/features/${featureName}/teams/${teamId}`,
      { status }
    )

    return data.success
  } catch (error) {
    console.error(`Error updating ${featureName} team override:`, error)
    throw error
  }
}

/**
 * Remove a team override from a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 */
export async function removeFeatureTeamOverride(
  featureName: string,
  teamId: number
): Promise<boolean> {
  try {
    const { data } = await apiClient.delete<{ success: boolean }>(
      `admin/features/${featureName}/teams/${teamId}`
    )

    return data.success
  } catch (error) {
    console.error(`Error removing ${featureName} team override:`, error)
    throw error
  }
}

/**
 * Transform feature data to team override format
 */
export function transformToTeamOverrides(
  feature: FeatureWithOverrides | null
): TeamRestrictionOverride[] {
  if (!feature?.overrides) return []

  return feature.overrides.map(override => ({
    teamId: override.teamId,
    teamName: override.teamName,
    status: override.status
  }))
}

// Legacy function aliases for backwards compatibility
export async function fetchSubmitRestrictionFeature(): Promise<FeatureWithOverrides> {
  return fetchFeatureRestrictions('SUBMIT_RESTRICTION')
}

export async function updateGlobalRestriction(
  status: FeatureStatus
): Promise<boolean> {
  return updateGlobalFeatureRestriction('SUBMIT_RESTRICTION', status)
}

export async function createTeamOverride(
  teamId: number,
  status: FeatureStatus
): Promise<boolean> {
  return createFeatureTeamOverride('SUBMIT_RESTRICTION', teamId, status)
}

export async function updateTeamOverride(
  teamId: number,
  status: FeatureStatus
): Promise<boolean> {
  return updateFeatureTeamOverride('SUBMIT_RESTRICTION', teamId, status)
}

export async function removeTeamOverride(teamId: number): Promise<boolean> {
  return removeFeatureTeamOverride('SUBMIT_RESTRICTION', teamId)
}

export default apiClient
