import type {
  Feature,
  FeatureDetail,
  FeatureStatus,
  TeamRestrictionOverride
} from '~/types'
import { useAuthStore } from '~/stores/useAuthStore'

const SUBMIT_RESTRICTION_FEATURE = 'SUBMIT_RESTRICTION'

export function useFeatures() {
  const runtimeConfig = useRuntimeConfig()
  const backendUrl = runtimeConfig.public.backendUrl
  const authStore = useAuthStore()
  const toast = useToast()

  // State
  const features = ref<Feature[]>([])
  const currentFeature = ref<FeatureDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Get authorization headers
   */
  const getAuthHeaders = () => {
    const token = authStore.getToken()
    if (!token) {
      throw new Error('Authentication required')
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Handle API errors consistently
   */
  const handleApiError = (
    response: Response,
    defaultMessage: string
  ): string => {
    if (response.status === 401) {
      authStore.clearAuth()
      return 'Authentication expired. Please sign in again.'
    }
    if (response.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (response.status === 404) {
      return 'Resource not found.'
    }
    if (response.status === 409) {
      return 'Resource already exists.'
    }
    return defaultMessage
  }

  /**
   * Fetch all features
   */
  const fetchFeatures = async (): Promise<Feature[]> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${backendUrl}/api/admin/features`, {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        error.value = handleApiError(response, 'Failed to fetch features')
        return []
      }

      const data = await response.json()
      features.value = data.data || []
      return features.value
    } catch (e) {
      console.error('Error fetching features:', e)
      error.value = 'An error occurred while fetching features'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch a specific feature by name
   */
  const fetchFeature = async (
    functionName: string
  ): Promise<FeatureDetail | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(
        `${backendUrl}/api/admin/features/${functionName}`,
        {
          headers: getAuthHeaders()
        }
      )

      if (!response.ok) {
        error.value = handleApiError(
          response,
          `Failed to fetch feature "${functionName}"`
        )
        return null
      }

      const data = await response.json()
      currentFeature.value = data.data
      return currentFeature.value
    } catch (e) {
      console.error('Error fetching feature:', e)
      error.value = 'An error occurred while fetching feature'
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Create a new feature
   */
  const createFeature = async (
    functionName: string,
    status: FeatureStatus
  ): Promise<Feature | null> => {
    try {
      const response = await fetch(`${backendUrl}/api/admin/features`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ functionName, status })
      })

      if (!response.ok) {
        const errorMsg = handleApiError(response, 'Failed to create feature')
        toast.add({ title: 'Error', description: errorMsg, color: 'error' })
        return null
      }

      const data = await response.json()
      toast.add({
        title: 'Success',
        description: data.message || 'Feature created successfully',
        color: 'success'
      })
      return data.data
    } catch (e) {
      console.error('Error creating feature:', e)
      toast.add({
        title: 'Error',
        description: 'An error occurred while creating feature',
        color: 'error'
      })
      return null
    }
  }

  /**
   * Update a feature's status
   */
  const updateFeature = async (
    functionName: string,
    status: FeatureStatus
  ): Promise<Feature | null> => {
    try {
      const response = await fetch(
        `${backendUrl}/api/admin/features/${functionName}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status })
        }
      )

      if (!response.ok) {
        const errorMsg = handleApiError(response, 'Failed to update feature')
        toast.add({ title: 'Error', description: errorMsg, color: 'error' })
        return null
      }

      const data = await response.json()
      toast.add({
        title: 'Success',
        description: data.message || 'Feature updated successfully',
        color: 'success'
      })
      return data.data
    } catch (e) {
      console.error('Error updating feature:', e)
      toast.add({
        title: 'Error',
        description: 'An error occurred while updating feature',
        color: 'error'
      })
      return null
    }
  }

  /**
   * Create a team override
   */
  const createTeamOverride = async (
    functionName: string,
    teamId: number,
    status: FeatureStatus
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${backendUrl}/api/admin/features/${functionName}/teams/${teamId}`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status })
        }
      )

      if (!response.ok) {
        const errorMsg = handleApiError(
          response,
          'Failed to create team override'
        )
        toast.add({ title: 'Error', description: errorMsg, color: 'error' })
        return false
      }

      const data = await response.json()
      toast.add({
        title: 'Success',
        description: data.message || 'Override created successfully',
        color: 'success'
      })
      return true
    } catch (e) {
      console.error('Error creating team override:', e)
      toast.add({
        title: 'Error',
        description: 'An error occurred while creating override',
        color: 'error'
      })
      return false
    }
  }

  /**
   * Update a team override
   */
  const updateTeamOverride = async (
    functionName: string,
    teamId: number,
    status: FeatureStatus
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${backendUrl}/api/admin/features/${functionName}/teams/${teamId}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status })
        }
      )

      if (!response.ok) {
        const errorMsg = handleApiError(
          response,
          'Failed to update team override'
        )
        toast.add({ title: 'Error', description: errorMsg, color: 'error' })
        return false
      }

      const data = await response.json()
      toast.add({
        title: 'Success',
        description: data.message || 'Override updated successfully',
        color: 'success'
      })
      return true
    } catch (e) {
      console.error('Error updating team override:', e)
      toast.add({
        title: 'Error',
        description: 'An error occurred while updating override',
        color: 'error'
      })
      return false
    }
  }

  /**
   * Delete a team override
   */
  const deleteTeamOverride = async (
    functionName: string,
    teamId: number
  ): Promise<boolean> => {
    try {
      const response = await fetch(
        `${backendUrl}/api/admin/features/${functionName}/teams/${teamId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      )

      if (!response.ok) {
        const errorMsg = handleApiError(
          response,
          'Failed to remove team override'
        )
        toast.add({ title: 'Error', description: errorMsg, color: 'error' })
        return false
      }

      const data = await response.json()
      toast.add({
        title: 'Success',
        description: data.message || 'Override removed successfully',
        color: 'success'
      })
      return true
    } catch (e) {
      console.error('Error deleting team override:', e)
      toast.add({
        title: 'Error',
        description: 'An error occurred while removing override',
        color: 'error'
      })
      return false
    }
  }

  // =============================================
  // Submit Restriction Specific Helpers
  // =============================================

  /**
   * Fetch submit restriction feature
   */
  const fetchSubmitRestriction = async (): Promise<FeatureDetail | null> => {
    return fetchFeature(SUBMIT_RESTRICTION_FEATURE)
  }

  /**
   * Ensure submit restriction feature exists, create if not
   */
  const ensureSubmitRestrictionExists
    = async (): Promise<FeatureDetail | null> => {
      let feature = await fetchSubmitRestriction()

      if (!feature) {
        // Create the feature if it doesn't exist
        const created = await createFeature(
          SUBMIT_RESTRICTION_FEATURE,
          'enabled'
        )
        if (created) {
          feature = await fetchSubmitRestriction()
        }
      }

      return feature
    }

  /**
   * Update submit restriction global status
   * enabled = restriction active (can only submit for current week)
   * disabled = no restriction (can submit anytime)
   */
  const updateSubmitRestrictionGlobal = async (
    isRestricted: boolean
  ): Promise<boolean> => {
    const status: FeatureStatus = isRestricted ? 'enabled' : 'disabled'
    const result = await updateFeature(SUBMIT_RESTRICTION_FEATURE, status)
    return result !== null
  }

  /**
   * Create submit restriction override for a team
   * enabled = team is restricted (current week only)
   * disabled = team is unrestricted (can submit anytime)
   */
  const createSubmitRestrictionOverride = async (
    teamId: number,
    isRestricted: boolean
  ): Promise<boolean> => {
    const status: FeatureStatus = isRestricted ? 'enabled' : 'disabled'
    return createTeamOverride(SUBMIT_RESTRICTION_FEATURE, teamId, status)
  }

  /**
   * Update submit restriction override for a team
   */
  const updateSubmitRestrictionOverride = async (
    teamId: number,
    isRestricted: boolean
  ): Promise<boolean> => {
    const status: FeatureStatus = isRestricted ? 'enabled' : 'disabled'
    return updateTeamOverride(SUBMIT_RESTRICTION_FEATURE, teamId, status)
  }

  /**
   * Remove submit restriction override for a team (team will inherit global setting)
   */
  const removeSubmitRestrictionOverride = async (
    teamId: number
  ): Promise<boolean> => {
    return deleteTeamOverride(SUBMIT_RESTRICTION_FEATURE, teamId)
  }

  /**
   * Transform feature overrides to TeamRestrictionOverride format
   */
  const transformToTeamOverrides = (
    feature: FeatureDetail | null
  ): TeamRestrictionOverride[] => {
    if (!feature || !feature.teamFunctionOverrides) return []

    return feature.teamFunctionOverrides.map(override => ({
      teamId: override.teamId,
      teamName: override.team?.name || `Team ${override.teamId}`,
      isRestricted: override.status === 'enabled',
      updatedAt: override.updatedAt
    }))
  }

  /**
   * Check if global restriction is enabled
   */
  const isGloballyRestricted = computed(() => {
    if (!currentFeature.value) return true // Default to restricted
    return currentFeature.value.status === 'enabled'
  })

  return {
    // State
    features,
    currentFeature,
    isLoading,
    error,

    // Computed
    isGloballyRestricted,

    // Generic feature methods
    fetchFeatures,
    fetchFeature,
    createFeature,
    updateFeature,
    createTeamOverride,
    updateTeamOverride,
    deleteTeamOverride,

    // Submit restriction specific methods
    fetchSubmitRestriction,
    ensureSubmitRestrictionExists,
    updateSubmitRestrictionGlobal,
    createSubmitRestrictionOverride,
    updateSubmitRestrictionOverride,
    removeSubmitRestrictionOverride,
    transformToTeamOverrides
  }
}
