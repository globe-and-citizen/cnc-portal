import type { Address } from 'viem'

/**
 * SafeDepositRouter contract function names
 */
export const SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES = {
  // Admin functions
  ENABLE_DEPOSITS: 'enableDeposits',
  DISABLE_DEPOSITS: 'disableDeposits',
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  RENOUNCE_OWNERSHIP: 'renounceOwnership',

  // Configuration functions
  SET_SAFE_ADDRESS: 'setSafeAddress',
  SET_INVESTOR_ADDRESS: 'setInvestorAddress',
  SET_MULTIPLIER: 'setMultiplier',
  ADD_TOKEN_SUPPORT: 'addTokenSupport',
  REMOVE_TOKEN_SUPPORT: 'removeTokenSupport',

  // Deposit functions
  DEPOSIT: 'deposit',
  DEPOSIT_WITH_SLIPPAGE: 'depositWithSlippage',

  // Recovery functions
  RECOVER_ERC20: 'recoverERC20'
} as const

export type SafeDepositRouterFunctionName =
  (typeof SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES)[keyof typeof SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES]

export function isValidSafeDepositRouterFunction(fn: string): fn is SafeDepositRouterFunctionName {
  return Object.values(SAFE_DEPOSIT_ROUTER_FUNCTION_NAMES).includes(
    fn as SafeDepositRouterFunctionName
  )
}

/**
 * SafeDepositRouter configuration interface
 */
export interface SafeDepositRouterConfig {
  safeAddress: Address
  investorAddress: Address
  multiplier: bigint
  depositsEnabled: boolean
  paused: boolean
}

/**
 * Token support information
 */
export interface TokenSupportInfo {
  address: Address
  isSupported: boolean
  decimals: number
}

/**
 * Deposit calculation result
 */
export interface DepositCalculation {
  tokenAmount: bigint
  sherAmount: bigint
  multiplier: bigint
}
