/**
 * Safe contract composables - modular organization
 *
 * This file serves as the main entry point for all Safe contract functionality.
 * It re-exports all composables and utilities for easy importing.
 */

// Core composables
export { useSafeReads, useSafeAppUrls } from './reads'
export { useSafeWrites } from './writes'

// Main combined composable
import { useSafeReads } from './reads'
import { useSafeWrites } from './writes'

/**
 * Main Safe contract composable - combines all functionality
 */
export function useSafe() {
  const reads = useSafeReads()
  const writes = useSafeWrites()

  return {
    ...reads,
    ...writes
  }
}

// Re-export for backward compatibility
export default useSafe
