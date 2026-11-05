import type { TokenId } from '@/constant/index'

export interface TokenOption {
  symbol: string
  tokenId: TokenId
  name?: string
  balance: number
  price: number | null
  code: string
  spendableBalance?: number
}
