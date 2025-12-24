import { useQuery } from '@tanstack/vue-query'
import type { AxiosError } from 'axios'
import apiClient from '~/lib/axios'
import type { Feature } from '~/types'

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const useFeatures = () => {
//   const runtimeConfig = useRuntimeConfig()
//   const backendUrl = runtimeConfig.public.backendUrl
//   const authStore = useAuthStore()

  return useQuery<ApiResponse<Feature[]>, AxiosError>({
    queryKey: ['features'],
    queryFn: async () => {
      console.log('Fetching features from backend')
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
