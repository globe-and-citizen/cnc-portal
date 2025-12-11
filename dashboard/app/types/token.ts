export interface TokenDisplay {
  address: string
  symbol: string
  decimals: number
  balance: bigint
  formattedBalance: string
  pendingWithdrawals: bigint
  formattedPending: string
  totalWithdrawn: bigint
  formattedWithdrawn: string
  isNative: boolean
  shortAddress: string
}
