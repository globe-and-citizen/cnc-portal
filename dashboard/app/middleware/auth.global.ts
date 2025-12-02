import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware during SSR
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  // Public routes that don't require authentication
  const publicRoutes = ['/login']
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

  // Validate token with backend
  try {
    const runtimeConfig = useRuntimeConfig()
    const backendUrl = runtimeConfig.public.backendUrl

    const response = await fetch(`${backendUrl}/api/auth/token`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      // Token is invalid, clear auth and redirect to login
      authStore.clearAuth()
      return navigateTo('/login')
    }

    // Token is valid, allow navigation
    return
  } catch (error) {
    console.error('Error validating token:', error)
    // On error, clear auth and redirect to login
    authStore.clearAuth()
    return navigateTo('/login')
  }
})
