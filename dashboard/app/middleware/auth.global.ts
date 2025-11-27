import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware(async (to) => {
  // Skip middleware for login page
  if (to.path === '/login') {
    return
  }

  // Check authentication on client side only
  // Server-side cannot validate JWT tokens as they're stored in client localStorage
  if (import.meta.client) {
    const authStore = useAuthStore()

    // First check if we have auth data in store
    if (!authStore.isAuthenticated.value) {
      return navigateTo('/login')
    }

    // Optionally validate token on initial page load (not on every navigation)
    // This balances security with performance
    const hasValidatedToken = useState('hasValidatedToken', () => false)
    if (!hasValidatedToken.value) {
      hasValidatedToken.value = true
      // Import useSiwe dynamically to avoid SSR issues
      const { useSiwe } = await import('~/composables/useSiwe')
      const { validateToken } = useSiwe()
      const isValid = await validateToken()
      if (!isValid) {
        authStore.clearAuth()
        return navigateTo('/login')
      }
    }
  }
})
