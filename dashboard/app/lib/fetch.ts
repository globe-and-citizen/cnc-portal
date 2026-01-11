import { useAuthStore } from '~/stores/useAuthStore'

// const app = useNuxtApp()
// app.runWithContext(() => {})
export const apiFetch = $fetch.create({
  baseURL: `${useRuntimeConfig().public.backendUrl as string}/api/`,
  credentials: 'include',
  onRequest({ options }) {
    let token: string | null = null

    try {
      const authStore = useAuthStore()
      token = authStore.getToken()
    } catch {
      // Pinia not ready (early import or SSR context) – fallback to localStorage
      token = typeof localStorage !== 'undefined'
        ? localStorage.getItem('dashboard-auth-token')
        : null
    }

    if (token) {
      const headers = new Headers(options.headers as HeadersInit)
      headers.set('Authorization', `Bearer ${token}`)
      options.headers = headers
    }
  },
  onResponseError({ response }) {
    if (response.status === 401) {
      console.warn('Unauthorized request detected')
      // Clear auth on 401 responses
      try {
        const authStore = useAuthStore()
        authStore.clearAuth()
      } catch {
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('dashboard-auth-token')
          localStorage.removeItem('dashboard-auth-address')
        }
      }
    }
  }
})
