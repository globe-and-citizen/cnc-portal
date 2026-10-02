import { SUPPORTED_TOKENS, type TokenConfig } from '@/constant'
import { zeroAddress } from 'viem'

const normalizedAddress = (address: string) => address.toLowerCase()

export const productExpenseToken = (address: string): TokenConfig | undefined =>
  SUPPORTED_TOKENS.find((token) => normalizedAddress(token.address) === normalizedAddress(address))

/** Native currency is always supported; ERC-20 choices need both contract support and product metadata. */
export const expenseApprovalTokens = (supported: readonly string[] | undefined): TokenConfig[] => {
  const enabled = new Set((supported ?? []).map(normalizedAddress))
  return SUPPORTED_TOKENS.filter(
    (token) =>
      token.id === 'native' ||
      (normalizedAddress(token.address) !== normalizedAddress(zeroAddress) &&
        enabled.has(normalizedAddress(token.address)))
  )
}

export const isExpenseApprovalTokenAllowed = (
  address: string,
  supported: readonly string[] | undefined
): boolean =>
  expenseApprovalTokens(supported).some(
    (token) => normalizedAddress(token.address) === normalizedAddress(address)
  )
