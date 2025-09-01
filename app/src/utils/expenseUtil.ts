import type { ExpenseResponse, TokenBalance } from '@/types'
import { tokenSymbol } from './constantUtil'
import { zeroAddress } from 'viem'
import type { TokenId } from '@/constant'
import type { TableRow } from '@/components/TableComponent.vue'

export const getCurrentUserExpenses = (expenses: ExpenseResponse[], userAddress: string) => {
  if (!expenses || !userAddress || !Array.isArray(expenses)) return []
  return expenses.filter((expense) => expense.data.approvedAddress === userAddress)
}

export const getTokens = (expenses: TableRow[], signature: string, balances: TokenBalance[]) => {
  const tokenAddress = expenses.find((item) => item.signature === signature)?.data.tokenAddress

  const symbol = tokenSymbol(tokenAddress ?? '')
  const balance =
    tokenAddress === zeroAddress
      ? findToken('native', balances)?.amount
      : findToken('usdc', balances)?.amount

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

const findToken = (tokenId: TokenId, balances: TokenBalance[]) => {
  return balances.find((balance) => balance.token.id === tokenId)
}
