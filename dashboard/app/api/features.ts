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
 * Create a team override for a feature
 * @param featureName The name of the feature
 * @param teamId The team ID
 * @param status The restriction status
 */
export const createFeatureTeamOverride = async (
  featureName: string,
  teamId: number,
  payload: { status: FeatureStatus }
) => {
  // TODO: the team ID should be part of the payload interface, update in the backend as well
  return await apiFetch<boolean>(`/admin/features/${featureName}/teams/${teamId}`, {
    method: 'POST',
    body: payload
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
  return await apiFetch(`/admin/features/${featureName}/teams/${teamId}`, {
    method: 'DELETE'
  })
}
