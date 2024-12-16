import type { BytesLike } from "ethers"

export interface BudgetLimit {
  approvedAddress: string
  budgetData: BudgetData[]
  expiry: number
}

export interface ExpenseData {
  data: BudgetLimit
  signature: BytesLike
}

export interface BudgetData {
  budgetType: number
  value: number
}
