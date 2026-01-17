import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import type { MaybeRefOrGetter } from 'vue'
import { toValue } from 'vue'
import {
  createFeature,
  createFeatureTeamOverride,
  deleteFeature,
  getFeature,
  getFeatures,
  removeFeatureTeamOverride,
  updateFeature,
  updateFeatureTeamOverride
} from '~/api/features'
import type { FeatureStatus } from '~/types'

interface CreateFeaturePayload {
  functionName: string
  status: FeatureStatus
}

interface UpdateFeaturePayload {
  functionName: string
  status: FeatureStatus
}

/**
 * Fetch all features
 */
export const useFeaturesQuery = () => {
  return useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      return await getFeatures()
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Fetch a single feature by name
 * @param functionName The name of the feature
 */
export const useFeatureQuery = (functionName: MaybeRefOrGetter<string>) => {
  return useQuery({
    queryKey: ['feature', { name: toValue(functionName) }],
    queryFn: async () => {
      const name = toValue(functionName)
      return await getFeature(name)
    },
    enabled: () => !!toValue(functionName),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })
}

/**
 * Create a new feature
 */
export const useCreateFeatureQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (payload: CreateFeaturePayload) => {
      return await createFeature(payload)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      toast.add({
        title: 'Feature Created',
        description: `${variables.functionName} is now ${variables.status}`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to create feature. Please try again.'
      toast.add({
        title: 'Creation Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Delete a feature
 * This will also delete all associated overrides
 */
export const useDeleteFeatureQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (functionName: string) => {
      return await deleteFeature(functionName)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      toast.add({
        title: 'Feature Deleted',
        description: `${variables} and all its overrides have been removed`,
        color: 'success',
        icon: 'i-lucide-trash-2'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to delete feature. It may be in use.'
      toast.add({
        title: 'Deletion Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Update a feature's status
 */
export const useUpdateFeatureQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async (payload: UpdateFeaturePayload) => {
      return await updateFeature(payload.functionName, { status: payload.status })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      toast.add({
        title: 'Feature Updated',
        description: `${variables.functionName} is now ${variables.status}`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to update feature status. Please try again.'
      toast.add({
        title: 'Update Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Create feature team override
 */
export const useCreateFeatureTeamOverrideQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ featureName, teamId, status }: { featureName: string, teamId: number, status: FeatureStatus }) => {
      return await createFeatureTeamOverride(featureName, { teamId, status })
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      queryClient.invalidateQueries({ queryKey: ['feature', { name: variables.featureName }] })
      toast.add({
        title: 'Override Created',
        description: `Team will now use ${variables.status} setting for this feature`,
        color: 'success',
        icon: 'i-lucide-shield-check'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to create team override. Please try again.'
      toast.add({
        title: 'Override Creation Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Update feature team override
 */
export const useUpdateFeatureTeamOverrideQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ featureName, teamId, status }: { featureName: string, teamId: number, status: FeatureStatus }) => {
      return await updateFeatureTeamOverride(featureName, teamId, status)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      queryClient.invalidateQueries({ queryKey: ['feature', { name: variables.featureName }] })
      toast.add({
        title: 'Override Updated',
        description: `Team override changed to ${variables.status}`,
        color: 'success',
        icon: 'i-lucide-settings'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to update team override. Please try again.'
      toast.add({
        title: 'Update Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Remove feature team override
 */
export const useRemoveFeatureTeamOverrideQuery = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation({
    mutationFn: async ({ featureName, teamId }: { featureName: string, teamId: number }) => {
      return await removeFeatureTeamOverride(featureName, teamId)
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      queryClient.invalidateQueries({ queryKey: ['feature', { name: variables.featureName }] })
      toast.add({
        title: 'Override Removed',
        description: 'Team will now use the global feature setting',
        color: 'success',
        icon: 'i-lucide-shield-off'
      })
    },
    onError: (error) => {
      const errorMessage = error?.message || 'Unable to remove team override. Please try again.'
      toast.add({
        title: 'Removal Failed',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}
