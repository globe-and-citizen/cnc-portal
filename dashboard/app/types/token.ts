import type { Address } from 'viem'

export interface TokenDisplay {
  address: Address // Address of the token contract, zero address for native tokens
  symbol: string // Symbol of the token, e.g., "ETH", "USDC"
  decimals: number // Number of decimals the token uses, e.g., 18 for ETH
  balance: bigint // Balance of the token in smallest unit (wei for ETH)
  formattedBalance?: string // Human-readable balance, e.g., "1.2345"
  pendingWithdrawals?: bigint // Amount pending withdrawal in smallest unit
  formattedPending?: string // Human-readable pending withdrawal amount
  totalWithdrawn?: bigint // Total amount withdrawn in smallest unit
  formattedWithdrawn?: string // Human-readable total withdrawn amount
  // isNative: boolean // True if the token is the native blockchain token (e.g., ETH on Ethereum)
  shortAddress?: string // Shortened address for display, e.g., "0x1234...abcd" or "Native Token"
  formattedValue?: string // USD value of the token holdings
}
