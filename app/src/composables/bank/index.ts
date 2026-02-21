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

// Read composables
export {
  useBankAddress,
  useBankPaused,
  useBankOwner,
  useBankSupportedTokens,
  useDividendBalance,
  useTokenDividendBalance,
  useTotalDividend,
  useUnlockedBalance,
  useGetDividendBalances
} from './reads'

// Write composables
// Note: use direct imports from ./writes to match ERC20 structure
