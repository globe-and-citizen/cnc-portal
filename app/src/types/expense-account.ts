export interface BudgetLimit {
  approvedAddress: string
  budgetData: BudgetData[]
  expiry: number
}

interface BudgetData {
  budgetType: number
  value: number
}
