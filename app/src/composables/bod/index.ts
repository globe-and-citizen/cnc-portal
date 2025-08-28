/**
 * BOD contract composables - modular organization
 *
 * This file serves as the main entry point for all Bank contract functionality.
 * It re-exports all composables and utilities for easy importing.
 */

// Types and constants
export * from './types'

// Utility functions
// export * from './utils'

// Core composables
export { useBodReads } from './reads'
export { useBodWrites } from './writes'
export { useBodWritesFunctions } from './functions'

// Main combined composable
import { useBodReads } from './reads'
import { useBodWritesFunctions } from './functions'
import type { Abi, Address } from 'viem'

/**
 * Main BOD contract composable - combines all functionality
 */
export function useBodContract() {
  const reads = useBodReads()
  const writeFunctions = useBodWritesFunctions()

  return {
    ...reads,
    ...writeFunctions
  }
}

// Re-export for backward compatibility
export default useBodContract
