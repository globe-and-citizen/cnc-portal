export interface BudgetLimit {
  approvedAddress: string,
  budgetType: 0 | 1 | 2 | null,
  value: string | number | bigint,
  expiry: number
}