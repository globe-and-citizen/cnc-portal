/**
 * Bank contract composables - modular organization
 * 
 * This file serves as the main entry point for all Bank contract functionality.
 * It re-exports all composables and utilities for easy importing.
 */

// Types and constants
export * from './types'

// Utility functions
export * from './utils'

// Core composables
export { useBankReads } from './reads'
export { useBankWrites } from './writes'
export { useBankWritesFunctions } from './functions'

// Legacy functions
export { useBankGetFunction } from './legacy'

// Main combined composable
import { useBankReads } from './reads'
import { useBankWritesFunctions } from './functions'

/**
 * Main Bank contract composable - combines all functionality
 */
export function useBankContract() {
  const reads = useBankReads()
  const writeFunctions = useBankWritesFunctions()

  return {
    ...reads,
    ...writeFunctions
  }
}

// Re-export for backward compatibility
export default useBankContract
