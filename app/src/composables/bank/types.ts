/**
 * Bank contract types and constants
 */

/**
 * Valid Bank contract function names extracted from ABI
 */
export const BANK_FUNCTION_NAMES = {
  // Read functions
  PAUSED: 'paused',
  OWNER: 'owner',
  // IS_TOKEN_SUPPORTED: 'isTokenSupported',
  SUPPORTED_TOKENS: 'supportedTokens',

  // Write functions
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  RENOUNCE_OWNERSHIP: 'renounceOwnership',
  DEPOSIT_TOKEN: 'depositToken',
  TRANSFER: 'transfer',
  TRANSFER_TOKEN: 'transferToken',
  INITIALIZE: 'initialize',
  DEPOSIT_DIVIDENDS: 'depositDividends',
  CLAIM_DIVIDEND: 'claimDividend',
  SET_INVESTOR_ADDRESS: 'setInvestorAddress',
  DIVIDEND_BALANCES: 'dividendBalances',
  TOTAL_DIVIDEND: 'totalDividends',
  GET_UNLOCK_BALANCE: 'getUnlockedBalance'
} as const

/**
 * Type for valid Bank contract function names
 */
export type BankFunctionName = (typeof BANK_FUNCTION_NAMES)[keyof typeof BANK_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the Bank contract
 */
export function isValidBankFunction(functionName: string): functionName is BankFunctionName {
  return Object.values(BANK_FUNCTION_NAMES).includes(functionName as BankFunctionName)
}
