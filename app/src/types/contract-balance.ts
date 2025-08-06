import type { SUPPORTED_TOKENS } from '@/constant'

export type TokenBalanceValue = {
  value: number
  formated: string
  id: string
  code: string
  symbol: string
  price: number
  formatedPrice: string
}

export interface TokenBalance {
  amount: number
  token: (typeof SUPPORTED_TOKENS)[number]
  values: Record<string, TokenBalanceValue>
}
