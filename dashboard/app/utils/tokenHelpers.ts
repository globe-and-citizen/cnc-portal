import { formatUnits } from 'viem'
import { TOKEN_DECIMALS, TOKEN_SYMBOLS } from '@/constant'
import type { TokenDisplay } from '@/types/token'

export const makeToken = (
  address: string,
  raw: bigint,
  decimals: number,
  symbol: string,
  isNative: boolean
): TokenDisplay => ({
  address,
  symbol,
  decimals,
  balance: raw,
  formattedBalance: formatUnits(raw, decimals),
  pendingWithdrawals: 0n,
  formattedPending: '0',
  totalWithdrawn: 0n,
  formattedWithdrawn: '0',
  isNative,
  shortAddress:
    address === 'native'
      ? 'Native Token'
      : `${address.slice(0, 6)}...${address.slice(-4)}`
})

export const buildTokenList = (
  nativeBalance?: bigint,
  supportedTokensBalances?: Array<{ address: string, balance: bigint }>
): TokenDisplay[] => {
  const arr: TokenDisplay[] = []

  // Add native token
  if (nativeBalance !== undefined) {
    arr.push(makeToken('native', nativeBalance, 18, 'ETH', true))
  }

  // Add supported ERC20 tokens
  if (supportedTokensBalances && supportedTokensBalances.length > 0) {
    supportedTokensBalances.forEach(({ address, balance }) => {
      const checksummedAddress = address as `0x${string}`
      const symbol = TOKEN_SYMBOLS[checksummedAddress] || 'UNKNOWN'
      const decimals = TOKEN_DECIMALS[symbol as keyof typeof TOKEN_DECIMALS] || 18

      arr.push(
        makeToken(
          address,
          balance,
          decimals,
          symbol,
          false
        )
      )
    })
  }

  return arr
}
