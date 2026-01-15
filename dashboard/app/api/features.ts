import type { Feature, FeatureStatus } from '~/types'
import { apiFetch } from '~/lib/fetch'

// interface ApiResponse<T> {
//   success: boolean
//   data: T
//   message?: string
// }

interface CreateFeaturePayload {
  functionName: string
  status: FeatureStatus
}

interface UpdateFeaturePayload {
  status: FeatureStatus
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
 * Fetch all features
 */
export const getFeatures = async () => {
  return await apiFetch<Feature[]>('/admin/features')
}

/**
 * Fetch a single feature by name
 * @param functionName The name of the feature (e.g., 'SUBMIT_RESTRICTION')
 */
export const getFeature = async (functionName: string) => {
  return await apiFetch<Feature>(`/admin/features/${functionName}`)
}

/**
 * Create a new feature
 */
export const createFeature = async (payload: CreateFeaturePayload) => {
  return await apiFetch<Feature>('/admin/features', {
    method: 'POST',
    body: payload
  })
}

/**
 * Update a feature's status
 */
export const updateFeature = async (functionName: string, payload: UpdateFeaturePayload) => {
  return await apiFetch<Feature>(`/admin/features/${functionName}`, {
    method: 'PUT',
    body: payload
  })
}

/**
 * Delete a feature
 * This will also delete all associated overrides
 */
export const deleteFeature = async (functionName: string) => {
  return await apiFetch(`/admin/features/${functionName}`, {
    method: 'DELETE'
  })
}

/**
 * Fetch feature data with all overrides (generic for any feature)
 * @param featureName The name of the feature (e.g., 'SUBMIT_RESTRICTION')
 */
export const fetchFeatureRestrictions = async (featureName: string) => {
  // Backend returns the feature directly, not wrapped in ApiResponse
  return await apiFetch<FeatureWithOverrides>(`/admin/features/${featureName}`)
}

/**
 * Update global restriction setting (generic for any feature)
 * @param featureName The name of the feature
 * @param status The new status
 */
export const updateGlobalFeatureRestriction = async (
  featureName: string,
  status: FeatureStatus
) => {
  return await apiFetch<boolean>(`/admin/features/${featureName}`, {
    method: 'PUT',
    body: { status }
  })
}

/**
 * Create a team override for a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 * @param status The restriction status
 */
export const createFeatureTeamOverride = async (
  featureName: string,
  teamId: number,
  status: FeatureStatus
) => {
  return await apiFetch<boolean>(`/admin/features/${featureName}/teams/${teamId}`, {
    method: 'POST',
    body: { status }
  })
}

/**
 * Update a team override for a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 * @param status The new restriction status
 */
export const updateFeatureTeamOverride = async (
  featureName: string,
  teamId: number,
  status: FeatureStatus
) => {
  return await apiFetch<boolean>(`/admin/features/${featureName}/teams/${teamId}`, {
    method: 'PUT',
    body: { status }
  })
}

/**
 * Remove a team override from a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 */
export const removeFeatureTeamOverride = async (
  featureName: string,
  teamId: number
) => {
  return await apiFetch<boolean>(`/admin/features/${featureName}/teams/${teamId}`, {
    method: 'DELETE'
  })
}

/**
 * Transform feature data to team override format
 */
export const transformToTeamOverrides = (
  feature: FeatureWithOverrides | null
): TeamRestrictionOverride[] => {
  if (!feature?.overrides) {
    return []
  }

  return feature.overrides.map(override => ({
    teamId: override.teamId,
    teamName: override.teamName,
    status: override.status
  }))
}
