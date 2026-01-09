import { useSafeContract } from '@/composables/safe'

/**
 * Backward-compatible wrapper that now simply exposes the Safe composable module
 * (reads + writes). All logic lives under app/src/composables/safe.
 */
export function useSafe() {
  return useSafeContract()
}
