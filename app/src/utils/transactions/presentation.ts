import type { TokenId } from '@/constant'
import { NETWORK } from '@/constant'
import type { Member, User } from '@/types'
import { getTokenIcon, resolveTokenIdByAddress, tokenSymbol } from '@/utils/tokens/metadata'

export interface SupportedTokenPresentation {
  address: string
  id: TokenId
  symbol: string
}

export interface TransactionDirectory {
  contracts?: ReadonlyArray<{ address: string; type: string }>
  members?: ReadonlyArray<Member>
  tokens?: ReadonlyArray<SupportedTokenPresentation>
}

export interface TransactionPresentationUser extends User {
  address: string
  icon?: string
  name: string
}

export const resolveTransactionUser = (
  address: string,
  directory: TransactionDirectory
): TransactionPresentationUser => {
  const lower = address?.toLowerCase() ?? ''

  const contract = directory.contracts?.find((item) => item.address.toLowerCase() === lower)
  if (contract) return { name: contract.type, address, icon: 'heroicons:document-text' }

  const member = directory.members?.find((item) => item.address?.toLowerCase() === lower)
  if (member) return member

  const token = directory.tokens?.find((item) => item.address.toLowerCase() === lower)
  if (token) {
    return {
      name: token.symbol,
      address,
      imageUrl: getTokenIcon(token.id)
    }
  }

  return { name: 'User', address }
}

export const enrichTransactionPresentation = (
  transaction: {
    amount: string | number
    tokenAddress?: string
    token: string
  },
  context: {
    supportedTokens: ReadonlyArray<SupportedTokenPresentation>
    getTokenPrice: (tokenId: TokenId) => number
  }
) => {
  const tokenAddress = String(transaction.tokenAddress ?? '').toLowerCase()
  const matchedToken = context.supportedTokens.find(
    (token) => token.address.toLowerCase() === tokenAddress
  )
  const token =
    matchedToken?.symbol || tokenSymbol(tokenAddress) || transaction.token || NETWORK.currencySymbol
  const tokenId = matchedToken?.id ?? resolveTokenIdByAddress(tokenAddress)
  const amount = transaction.amount ?? 0
  const numericAmount = Number(amount)
  const priceInLocal = tokenId ? context.getTokenPrice(tokenId) : 0
  const amountLocal = Number.isFinite(numericAmount) ? numericAmount * priceInLocal : 0

  return { tokenAddress, token, amount, amountLocal }
}
