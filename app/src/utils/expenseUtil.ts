import type { ExpenseResponse, TokenBalance } from '@/types'
import { tokenSymbol } from './constantUtil'
import { zeroAddress } from 'viem'
import type { TokenId } from '@/constant'

export const getCurrentUserExpenses = (expenses: ExpenseResponse[], userAddress: string) => {
  if (!expenses || !userAddress || !Array.isArray(expenses)) return []
  return expenses.filter((expense) => expense.data.approvedAddress === userAddress)
}

export const getTokens = (
  expenses: ExpenseResponse[],
  signature: string,
  balances: TokenBalance[]
) => {
  const tokenAddress = expenses.find((item) => item.signature === signature)?.data.tokenAddress

  const symbol = tokenSymbol(tokenAddress ?? '')
  const balance = tokenAddress === zeroAddress ? balances[1].amount : balances[0].amount

  return symbol && !isNaN(Number(balance))
    ? [
        {
          symbol,
          balance: Number(balance),
          tokenId: (tokenAddress ?? '') as TokenId // Ensure tokenId is of type TokenId
        }
      ]
    : []
}
