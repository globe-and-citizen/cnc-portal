/**
 * SafeDepositRouter contract composables
 *
 * Provides read and write operations for the SafeDepositRouter contract
 */

// Types and constants
export * from './types'

// Core composables
export { useSafeDepositRouterReads } from './reads'
export { useSafeDepositRouterWrites } from './writes'
export { useSafeDepositRouterFunctions } from './functions'

// Main combined composable
import { useSafeDepositRouterReads } from './reads'
import { useSafeDepositRouterFunctions } from './functions'

/**
 * Main SafeDepositRouter contract composable - combines all functionality
 */
export function useSafeDepositRouterContract() {
  const reads = useSafeDepositRouterReads()
  const writeFunctions = useSafeDepositRouterFunctions()

  return {
    ...reads,
    ...writeFunctions
  }
}

// Re-export for backward compatibility
export default useSafeDepositRouterContract
