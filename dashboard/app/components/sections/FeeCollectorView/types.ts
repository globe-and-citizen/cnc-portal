import type { Address } from 'viem'

export interface TokenData {
  address: Address
  symbol: string
  decimals: number
  balance: bigint
  pendingWithdrawals?: bigint
  totalWithdrawn?: bigint
}

export interface NativeBalanceData {
  balance: bigint
  pendingWithdrawals?: bigint
  totalWithdrawn?: bigint
}

export interface WithdrawHistory {
  timestamp: number
  amount: bigint
  token?: Address
  txHash: string
}

export const SELECTORS = {
  nativeBalanceCard: '[data-test="native-balance-card"]',
  tokenBalanceCard: '[data-test="token-balance-card"]',
  withdrawButton: '[data-test="withdraw-button"]',
  withdrawNativeModal: '[data-test="withdraw-native-modal"]',
  withdrawTokenModal: '[data-test="withdraw-token-modal"]',
  pendingAmount: '[data-test="pending-amount"]',
  withdrawnAmount: '[data-test="withdrawn-amount"]',
  balanceAmount: '[data-test="balance-amount"]'
} as const
