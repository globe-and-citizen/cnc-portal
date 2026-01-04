export interface Safe {
  address: string
  chain: string
  balance: string
  symbol: string
}

export interface SafeBalanceItem {
  tokenAddress: string | null
  token?: {
    symbol?: string | null
    decimals?: number | null
  } | null
  balance: string
}

export interface Confirmation {
  owner: string
  signature: string
}

export interface SafeTx {
  safeTxHash: string
  nonce: number
  to: string
  value: string
  isExecuted: boolean
  confirmations?: Confirmation[]
  confirmationsRequired?: number
  transactionHash?: string
}
