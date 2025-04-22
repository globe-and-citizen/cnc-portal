import type { BytesLike } from 'ethers'

export interface BudgetLimit {
  approvedAddress: string
  budgetData: BudgetData[]
  expiry: number
  tokenAddress: string
}

export interface ExpenseData {
  data: BudgetLimit
  signature: BytesLike
}

export interface BudgetData {
  budgetType: number
  value: number
}

export interface ManyExpenseResponse {
  approvedAddress: string
  tokenAddress: string
  budgetData: BudgetData[]
  expiry: number
  signature: `0x${string}`
  name: string
  avatarUrl: string | null
}

export interface ManyExpenseWithBalances {
  approvedAddress: string
  tokenAddress: string
  budgetData: BudgetData[]
  expiry: number
  signature: `0x${string}`
  name: string
  avatarUrl: string | null
  balances: {
    0: string
    1: string
    2?: boolean
  }
  status?: 'disabled' | 'enabled' | 'expired'
}

export interface ExpenseResponse {
  balances: {
    0: string
    1: string
  }
  status: string
  teamId: number
  id: number
  userAddress: string
  signature: string
  data: BudgetLimit
  createdAt: Date
  updatedAt: Date
}
