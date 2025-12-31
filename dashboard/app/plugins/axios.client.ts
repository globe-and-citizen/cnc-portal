/**
 * Axios setup plugin for Nuxt
 * Initializes authentication interceptor after app is ready
 *
 * This plugin should be imported in app.vue or main entry point
 * to ensure router is available when setting up the interceptor
 */

export default defineNuxtPlugin(async () => {
  // Get router from nuxt context
  const router = useRouter()

  // Import and setup auth interceptor
  const { setupAuthInterceptor } = await import('@/lib/axios')

  // Setup the interceptor after app initialization
  setupAuthInterceptor(router)

  // Make apiClient available globally if needed
  const { apiClient } = await import('@/lib/axios')

  return {
    provide: {
      apiClient
    }
  }
})
