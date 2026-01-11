import { useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '~/stores/useAuthStore'
import type { ApiUser } from '~/types/index'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware during SSR
  if (import.meta.server) {
    return
  }

  // Public routes that don't require authentication
  const publicRoutes = ['/login']
  const isPublicRoute = publicRoutes.includes(to.path)

  // If navigating to a public route, allow access
  if (isPublicRoute) {
    return
  }

  const authStore = useAuthStore()
  // Check if user is authenticated
  const token = authStore.getToken()

  if (!token) {
    // Not authenticated, redirect to login
    return navigateTo('/login')
  }

  const queryClient = useQueryClient()
  try {
    const userAddress = toValue(authStore.address) || ''
    const user = await queryClient.fetchQuery({
      queryKey: ['user', { address: userAddress }],
      queryFn: async () => {
        const data = await $fetch<ApiUser>(`user/${userAddress}`, {
          baseURL: `${useRuntimeConfig().public.backendUrl as string}/api/`,
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        return data
      },
      staleTime: 1000 * 60 * 5 // 5 minutes
    })

    if (!user.roles.some(role => role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN')) {
      return navigateTo('/access-denied')
    } else {
      // if is admin and the route is access-denied, redirect to home
      if (to.path === '/access-denied') {
        return navigateTo('/')
      }
      // User is authenticated and has required roles, allow access
      return
    }
  } catch (error) {
    console.error('Authentication middleware error while fetching user or checking roles:', error)
    authStore.clearAuth()
    return navigateTo('/login')
  }
})
