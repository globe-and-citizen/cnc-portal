import type { ExpenseResponse, TokenBalance, TokenOption } from '@/types'
import { tokenSymbol } from './constantUtil'
import { zeroAddress } from 'viem'
import type { TokenId } from '@/constant'
import type { TableRow } from '@/types/table'

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

export const getCustomFrequency = (customFrequency: number) => {
  if (customFrequency <= 0) return 'N/A'
  const days = Math.floor(customFrequency / (24 * 60 * 60))
  return `${days} day(s)`
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
          price: balances.find((b) => b.token.id === tokenId)?.price.usd.value || 0,
          code: balances.find((b) => b.token.id === tokenId)?.token.code || ''
        }
      ]
    : []
}

const findToken = (tokenId: TokenId, balances: TokenBalance[]) => {
  return balances.find((balance) => balance.token.id === tokenId)
}

/**
 * Calculate remaining spendable balance for an expense.
 *
 * The cap is whichever runs out first: the budget the owner approved, or what
 * the contract actually holds — an ERC-20 transfer pays from the contract's own
 * balance, so a funded budget on an empty contract is not spendable.
 *
 * @param expense The expense row data
 * @param contractBalance Contract holdings of the expense's token
 * @returns The remaining balance that can be spent, never negative
 */
const getRemainingExpenseBalance = (expense: TableRow, contractBalance: number): number => {
  // Both are 0 on a never-used expense, and `balances` is absent on rows the
  // backend short-circuits. Truthiness checks here read those as "no budget"
  // and collapse the whole approval to 0 — coerce instead.
  const maxAmount = Number(expense.data?.amount ?? 0)
  const amountTransferred = Number(expense.balances?.[1] ?? 0)

  const remainingBudget =
    Number.isFinite(maxAmount) && Number.isFinite(amountTransferred)
      ? Math.max(maxAmount - amountTransferred, 0)
      : 0

  return Math.min(contractBalance, remainingBudget)
}
