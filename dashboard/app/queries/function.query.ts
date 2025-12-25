import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import type { AxiosError } from 'axios'
import apiClient from '~/lib/axios'
import type { Feature, FeatureStatus } from '~/types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

interface ErrorResponse {
  message?: string
}

interface CreateFeaturePayload {
  functionName: string
  status: FeatureStatus
}

/**
 * Fetch all features
 */
export const useFeatures = () => {
  return useQuery<ApiResponse<Feature[]>, AxiosError>({
    queryKey: ['features'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<Feature[]>>('admin/features')
      return data
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
    staleTime: 180000,
    gcTime: 300000
  })
}

/**
 * Create a new feature
 */
export const useCreateFeature = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation<ApiResponse<Feature>, AxiosError, CreateFeaturePayload>({
    mutationFn: async (payload: CreateFeaturePayload) => {
      const { data } = await apiClient.post<ApiResponse<Feature>>('admin/features', payload)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      toast.add({
        title: 'Success',
        description: data.message || 'Feature created successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = (error.response?.data as ErrorResponse)?.message || 'Failed to create feature'
      toast.add({
        title: 'Error',
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
export const useDeleteFeature = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  return useMutation<ApiResponse<void>, AxiosError, string>({
    mutationFn: async (functionName: string) => {
      const { data } = await apiClient.delete<ApiResponse<void>>(`admin/features/${functionName}`)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['features'] })
      toast.add({
        title: 'Success',
        description: data.message || 'Feature deleted successfully',
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    },
    onError: (error) => {
      const errorMessage = (error.response?.data as ErrorResponse)?.message || 'Failed to delete feature'
      toast.add({
        title: 'Error',
        description: errorMessage,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  })
}

/**
 * Update a feature's status (available for future use)
 */
export const updateFeature = async (
  functionName: string,
  status: FeatureStatus
): Promise<ApiResponse<Feature>> => {
  const { data } = await apiClient.put<ApiResponse<Feature>>(`admin/features/${functionName}`, {
    status
  })
  return data
}
