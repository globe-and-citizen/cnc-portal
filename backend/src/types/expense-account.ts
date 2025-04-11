export interface BudgetLimit {
  approvedAddress: string
  budgetData: {
    budgetType: number
    value: number
  }
  expiry: number
  tokenAddress: string
}