import type { ExpenseResponse } from '@/types'

export const getCurrentUserExpenses = (expenses: ExpenseResponse[], userAddress: string) => {
  if (!expenses || !userAddress || !Array.isArray(expenses)) return []
  return expenses.filter((expense) => expense.data.approvedAddress === userAddress)
}
