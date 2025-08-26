/**
 * ERC20 contract types and constants
 */

/**
 * Valid ERC20 contract function names extracted from ABI
 */
export const ERC20_FUNCTION_NAMES = {
  // Read functions
  NAME: 'name',
  SYMBOL: 'symbol',
  DECIMALS: 'decimals',
  TOTAL_SUPPLY: 'totalSupply',
  BALANCE_OF: 'balanceOf',
  ALLOWANCE: 'allowance',

  // Write functions
  TRANSFER: 'transfer',
  APPROVE: 'approve',
  TRANSFER_FROM: 'transferFrom'
} as const

/**
 * Type for valid ERC20 contract function names
 */
export type ERC20FunctionName = typeof ERC20_FUNCTION_NAMES[keyof typeof ERC20_FUNCTION_NAMES]

/**
 * Validate if a function name exists in the ERC20 contract
 * @param functionName The function name to validate
 * @returns True if the function name is a valid ERC20 function
 */
export const isValidERC20Function = (functionName: string): functionName is ERC20FunctionName => {
  return Object.values(ERC20_FUNCTION_NAMES).includes(functionName as ERC20FunctionName)
}
