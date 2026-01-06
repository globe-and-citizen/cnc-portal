import { useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/useAuthStore'
import { apiClient } from '~/lib/index'
import type { ApiUser } from '~/types/index'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware during SSR
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/access-denied']
  const isPublicRoute = publicRoutes.includes(to.path)

  // If navigating to a public route, allow access
  if (isPublicRoute) {
    return
  }

  // Check if user is authenticated
  const token = authStore.getToken()

  if (!token) {
    // Not authenticated, redirect to login
    return navigateTo('/login')
  }

  const queryClient = useQueryClient()
  try {
    const userAddress = toValue(authStore.address.value || '')
    const user = await queryClient.fetchQuery({
      queryKey: ['user', { address: userAddress }],
      queryFn: async () => {
        const { data } = await apiClient.get<ApiUser>(`user/${userAddress}`)
        return data
      },
      staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (!user.roles.some(role => role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN')) {
      return navigateTo('/access-denied')
    }
  } catch (error) {
    console.log(error)
    authStore.clearAuth()
    return navigateTo('/login')
  }
})
