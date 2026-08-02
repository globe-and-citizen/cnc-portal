import { erc20Abi, formatUnits, type Address } from 'viem'
import { getBalance, readContract, type Config } from '@wagmi/core'
import { SUPPORTED_TOKENS, type TokenConfig, type TokenId } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import type { TokenBalance, TokenBalanceValue } from '@/types'

/**
 * On-chain balances for one address, in each token's smallest unit, keyed by
 * `TokenConfig.id`. Deliberately raw: decimals and fiat conversion are applied
 * by the derivation helpers below, so the cached value never goes stale when
 * the user switches currency.
 */
export type RawTokenBalances = Record<string, bigint>

/** Price rows as exposed by `useCurrencyStore().getTokenInfo()`. */
export interface TokenPriceRow {
  id: string
  price: number | null
  code: string
  symbol: string
}

/**
 * Narrow structural view of `useCurrencyStore().getTokenInfo` — injected rather
 * than imported so the derivation stays a pure function.
 */
export type GetTokenInfo = (tokenId: TokenId) => { prices?: TokenPriceRow[] } | null

/**
 * Read every supported token's balance for `address` in one pass.
 *
 * Native goes through `getBalance`, ERC-20s through `balanceOf`. The calls are
 * fired in the same tick, so the batching http transport (see `wagmi.config`)
 * collapses them into a single JSON-RPC round-trip.
 *
 * A failing read rejects the whole call: a partial result would silently report
 * a 0 balance for the broken token and, worse, a wrong total. Callers surface
 * the rejection instead.
 */
export async function fetchTokenBalances(
  config: Config,
  params: {
    address: Address
    chainId?: number
    tokens?: readonly TokenConfig[]
  }
): Promise<RawTokenBalances> {
  const { address, chainId, tokens = SUPPORTED_TOKENS } = params

  const entries = await Promise.all(
    tokens.map(async (token): Promise<[string, bigint]> => {
      if (token.id === 'native') {
        const native = await getBalance(config, { address, chainId })
        return [token.id, native.value]
      }
      const balance = await readContract(config, {
        address: token.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
        chainId
      })
      return [token.id, balance]
    })
  )

  return Object.fromEntries(entries)
}

/**
 * Turn raw on-chain amounts into display balances, one entry per supported
 * token in `tokens` order.
 *
 * Kept separate from the fetch so that switching currency re-prices the cached
 * amounts instead of triggering a new round of RPC reads.
 */
export function toTokenBalances(
  tokens: readonly TokenConfig[],
  raw: RawTokenBalances,
  getTokenInfo: GetTokenInfo
): TokenBalance[] {
  return tokens.map((token) => {
    const amount = Number(formatUnits(raw[token.id] ?? 0n, token.decimals ?? 18))

    const values: Record<string, TokenBalanceValue> = {}
    for (const price of getTokenInfo(token.id)?.prices ?? []) {
      const value = amount * (price.price ?? 0)
      values[price.code] = {
        value,
        formated: formatCurrencyShort(value, price.code),
        id: price.id,
        code: price.code,
        symbol: price.symbol,
        price: price.price ?? 0,
        formatedPrice: formatCurrencyShort(price.price ?? 0, price.code)
      }
    }

    return { amount, token, values }
  })
}

/**
 * Sum every token balance per currency code.
 *
 * The currency set is taken from the first balance — all tokens are priced by
 * the same store call, so they carry the same codes. `price` / `formatedPrice`
 * are carried over from that first entry: a total spans several tokens, so it
 * has no unit price of its own.
 */
export function sumTokenBalances(
  balances: readonly TokenBalance[]
): Record<string, TokenBalanceValue> {
  const totals: Record<string, TokenBalanceValue> = {}
  const first = balances[0]
  if (!first) return totals

  for (const code of Object.keys(first.values)) {
    const reference = first.values[code]
    if (!reference) continue
    const sum = balances.reduce((acc, balance) => acc + (balance.values[code]?.value ?? 0), 0)
    totals[code] = {
      value: sum,
      formated: formatCurrencyShort(sum, code),
      id: reference.id,
      code: reference.code,
      symbol: reference.symbol,
      price: reference.price,
      formatedPrice: formatCurrencyShort(reference.price, code)
    }
  }

  return totals
}
