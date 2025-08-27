/**
 * ERC20 contract composables - modular organization
 *
 * This file serves as the main entry point for all ERC20 contract functionality.
 * It re-exports all composables and utilities for easy importing.
 */

// Types and constants
export * from './types'

// Core composables
export { useERC20Reads } from './reads'
export { useERC20Writes } from './writes'
export { useERC20WriteFunctions } from './functions'

// Main composable that combines all functionality
import { type Address } from 'viem'
import { useERC20Reads } from './reads'
import { useERC20Writes } from './writes'
import type { MaybeRef } from 'vue'

/**
 * Main ERC20 contract composable - combines all functionality
 * @param contractAddress The address of the ERC20 contract
 * @returns Object containing all read and write operations for the ERC20 contract
 */
export function useERC20Contract(contractAddress: MaybeRef<Address>) {
  const reads = useERC20Reads(contractAddress)
  const writes = useERC20Writes(contractAddress)

  return {
    ...reads,
    ...writes
  }
}

// Re-export for backward compatibility
export default useERC20Contract
