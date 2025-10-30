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
  SUPPORTED_TOKENS: 'supportedTokens',
  INVESTOR_ADDRESS: 'investorAddress',
  GET_TOKEN_DIVIDEND_BALANCE: 'getTokenDividendBalance',
  GET_UNLOCKED_TOKEN_BALANCE: 'getUnlockedTokenBalance',
  TOTAL_TOKEN_DIVIDENDS: 'totalTokenDividends',
  DIVIDEND_BALANCES: 'dividendBalances',
  TOKEN_DIVIDEND_BALANCES: 'tokenDividendBalances',
  TOTAL_DIVIDEND: 'totalDividends',
  GET_UNLOCK_BALANCE: 'getUnlockedBalance',

  // Write functions
  PAUSE: 'pause',
  UNPAUSE: 'unpause',
  TRANSFER_OWNERSHIP: 'transferOwnership',
  RENOUNCE_OWNERSHIP: 'renounceOwnership',
  ADD_TOKEN_SUPPORT: 'addTokenSupport',
  REMOVE_TOKEN_SUPPORT: 'removeTokenSupport',
  DEPOSIT_TOKEN: 'depositToken',
  TRANSFER: 'transfer',
  TRANSFER_TOKEN: 'transferToken',
  INITIALIZE: 'initialize',
  DEPOSIT_DIVIDENDS: 'depositDividends',
  DEPOSIT_TOKEN_DIVIDENDS: 'depositTokenDividends',
  CLAIM_DIVIDEND: 'claimDividend',
  CLAIM_TOKEN_DIVIDEND: 'claimTokenDividend',
  SET_INVESTOR_ADDRESS: 'setInvestorAddress'
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
