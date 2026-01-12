import { onMounted } from 'vue'
import { useBackendHealthQuery } from '@/queries/health.queries'

/**
 * Composable to wake up backend on component mount
 * Uses TanStack Query with silent error handling
 * Cache is valid for 3 minutes to reduce redundant calls
 *
 * @example
 * ```vue
 * <script setup>
 * import { useBackendWake } from '@/composables/useBackendWake'
 *
 * // Wakes backend when component mounts
 * useBackendWake()
 * </script>
 * ```
 */
export function useBackendWake() {
  const { refetch } = useBackendHealthQuery()

  onMounted(() => {
    // Non-blocking wake-up call
    refetch().catch((error) => {
      // Silently fail - this is a background optimization
      console.debug('Backend wake-up ping failed (non-critical):', error)
    })
  })
}
