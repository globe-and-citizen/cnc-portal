import { type Address } from 'viem'

export const ERC20_FUNCTION_NAMES = {
  NAME: 'name',
  SYMBOL: 'symbol',
  DECIMALS: 'decimals',
  TOTAL_SUPPLY: 'totalSupply',
  BALANCE_OF: 'balanceOf',
  ALLOWANCE: 'allowance',
  TRANSFER: 'transfer',
  APPROVE: 'approve',
  TRANSFER_FROM: 'transferFrom'
} as const

export type ERC20FunctionName = typeof ERC20_FUNCTION_NAMES[keyof typeof ERC20_FUNCTION_NAMES]

export const isValidERC20Function = (functionName: string): functionName is ERC20FunctionName => {
  return Object.values(ERC20_FUNCTION_NAMES).includes(functionName as ERC20FunctionName)
}
