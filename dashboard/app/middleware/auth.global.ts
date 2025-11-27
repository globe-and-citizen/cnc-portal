import { useAuthStore } from '~/stores/useAuthStore'

export default defineNuxtRouteMiddleware((to) => {
  // Skip middleware for login page
  if (to.path === '/login') {
    return
  }

  // Check authentication on client side only
  if (import.meta.client) {
    const authStore = useAuthStore()

    if (!authStore.isAuthenticated.value) {
      return navigateTo('/login')
    }
  }
})
