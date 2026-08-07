import { formatUnits, zeroAddress } from 'viem'
import type { TvlToken } from '~/types'

/**
 * USD valuation of raw TVL amounts.
 *
 * The backend returns raw on-chain integers keyed by `token.key`; pricing lives
 * here (and in the token-price store) so it stays in a single place. Stablecoins
 * the price store doesn't recognise (e.g. USDC.e) fall back to $1 rather than
 * being silently counted as $0.
 */

export type TokenPriceResolver = (token: { symbol: string, address: string }) => number

/** USD value of a single token's raw on-chain amount. */
export function valueRawAmount(
  raw: string | undefined,
  token: TvlToken,
  priceOf: TokenPriceResolver
): number {
  if (!raw || raw === '0') return 0
  const amount = Number(formatUnits(BigInt(raw), token.decimals))
  let price = priceOf({ symbol: token.symbol, address: token.address ?? zeroAddress })
  if (price === 0 && /^usd/i.test(token.symbol)) price = 1
  return amount * price
}

/** USD value of a raw-amount map (token.key -> raw string) across all tokens. */
export function valueRawAmounts(
  raw: Record<string, string>,
  tokens: TvlToken[],
  priceOf: TokenPriceResolver
): number {
  return tokens.reduce((total, token) => total + valueRawAmount(raw[token.key], token, priceOf), 0)
}
