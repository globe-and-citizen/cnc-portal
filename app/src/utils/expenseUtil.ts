import type { ExpenseResponse, TokenBalance, TokenOption } from '@/types'
import { tokenSymbol } from './constantUtil'
import { zeroAddress } from 'viem'
import type { TokenId } from '@/constant'
import type { TableRow } from '@/components/TableComponent.vue'
import type { BudgetData } from '@/types/expense-account'

// Frequency types mapping
export const frequencyTypes = [
  { value: 0, label: 'One Time' },
  { value: 1, label: 'Daily' },
  { value: 2, label: 'Weekly' },
  { value: 3, label: 'Monthly' },
  { value: 4, label: 'Custom' }
]

export const getFrequencyType = (frequencyType: number) => {
  const frequency = frequencyTypes.find((f) => f.value === frequencyType)
  return frequency ? frequency.label : 'Unknown'
}

export const getCurrentUserExpenses = (expenses: ExpenseResponse[], userAddress: string) => {
  if (!expenses || !userAddress || !Array.isArray(expenses)) return []
  return expenses.filter((expense) => expense.data.approvedAddress === userAddress)
}

export const getTokens = (
  expenses: TableRow[],
  signature: string,
  balances: TokenBalance[]
): TokenOption[] => {
  const expense = expenses.find((item) => item.signature === signature)
  if (!expense) return []

  const tokenAddress = expense.data.tokenAddress
  const symbol = tokenSymbol(tokenAddress ?? '')
  const tokenId = tokenAddress === zeroAddress ? 'native' : 'usdc'

  const balance =
    tokenAddress === zeroAddress
      ? findToken('native', balances)?.amount
      : findToken('usdc', balances)?.amount

  const spendableBalance = getRemainingExpenseBalance(expense, balance ?? 0)

  return symbol && !isNaN(Number(balance))
    ? [
        {
          symbol,
          balance: Number(balance),
          spendableBalance: spendableBalance,
          tokenId: tokenId as TokenId,
          price: balances.find((b) => b.token.id === tokenId)?.values['USD']?.price || 0,
          code: balances.find((b) => b.token.id === tokenId)?.token.code || ''
        }
      ]
    : []
}

const findToken = (tokenId: TokenId, balances: TokenBalance[]) => {
  return balances.find((balance) => balance.token.id === tokenId)
}

/**
 * Calculate remaining spendable balance for an expense
 * @param expense The expense row data
 * @returns The remaining balance that can be spent, or null if no budget data found
 */
export const getRemainingExpenseBalance = (expense: TableRow, contractBalance: number): number => {
  const budgetData = expense.data.budgetData as BudgetData[]
  const maxAmountData = expense.amount // budgetData.find((item) => item.budgetType === 1)?.value
  const amountTransferred = expense.balances[1]

  // Calculate remaining spendable amount
  const remainingBudget =
    maxAmountData && amountTransferred ? Number(maxAmountData) - Number(amountTransferred) : 0

  // Return the minimum between contract balance and remaining budget
  return Math.min(contractBalance, remainingBudget)
}
