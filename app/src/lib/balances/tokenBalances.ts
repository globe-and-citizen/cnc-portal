import { erc20Abi, formatUnits, type Address } from 'viem'
import { getBalance, readContract, type Config } from '@wagmi/core'
import { SUPPORTED_TOKENS, type TokenConfig, type TokenId } from '@/constant'
import { formatCurrencyShort } from '@/utils/currencyUtil'
import type { ContractBalances, CurrencyPair, Money, TokenBalance } from '@/types'

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

/** Currency codes to format each side of a `CurrencyPair` with. */
interface PairCodes {
  usd: string
  local: string
}

const money = (value: number, code: string): Money => ({
  value,
  formatted: formatCurrencyShort(value, code)
})

const pair = (usd: number, local: number, codes: PairCodes): CurrencyPair => ({
  usd: money(usd, codes.usd),
  local: money(local, codes.local)
})

/**
 * The store prices every token in the same two currencies, so the local code is
 * the same whichever token we ask about. Falls back to USD when prices have not
 * loaded yet — the amounts are 0 then anyway.
 */
function resolveCodes(tokens: readonly TokenConfig[], getTokenInfo: GetTokenInfo): PairCodes {
  for (const token of tokens) {
    const local = getTokenInfo(token.id)?.prices?.find((row) => row.id === 'local')
    if (local?.code) return { usd: 'USD', local: local.code }
  }
  return { usd: 'USD', local: 'USD' }
}

/**
 * Turn raw on-chain amounts into priced balances, one entry per token in
 * `tokens` order.
 *
 * Kept separate from the fetch so that switching currency re-prices the cached
 * amounts instead of triggering a new round of RPC reads.
 */
export function toTokenBalances(
  tokens: readonly TokenConfig[],
  raw: RawTokenBalances,
  getTokenInfo: GetTokenInfo,
  codes: PairCodes
): TokenBalance[] {
  return tokens.map((token) => {
    const rawAmount = raw[token.id] ?? 0n
    const amount = Number(formatUnits(rawAmount, token.decimals ?? 18))

    const rows = getTokenInfo(token.id)?.prices ?? []
    const usdPrice = rows.find((row) => row.id === 'usd')?.price ?? 0
    const localPrice = rows.find((row) => row.id === 'local')?.price ?? 0

    return {
      token,
      raw: rawAmount,
      amount,
      price: pair(usdPrice, localPrice, codes),
      value: pair(amount * usdPrice, amount * localPrice, codes)
    }
  })
}

/** Sum the held value of every token, in both currencies. */
export function sumTokenBalances(
  balances: readonly TokenBalance[],
  codes: PairCodes
): CurrencyPair {
  const usd = balances.reduce((acc, balance) => acc + balance.value.usd.value, 0)
  const local = balances.reduce((acc, balance) => acc + balance.value.local.value, 0)
  return pair(usd, local, codes)
}

/**
 * Full derivation: priced balances plus the aggregate across tokens.
 *
 * This is what `useContractBalance` exposes as `data`; it is a pure function of
 * the cached amounts and the current prices, so it re-runs on a currency switch
 * without any refetch.
 */
export function toContractBalances(
  tokens: readonly TokenConfig[],
  raw: RawTokenBalances,
  getTokenInfo: GetTokenInfo
): ContractBalances {
  const codes = resolveCodes(tokens, getTokenInfo)
  const balances = toTokenBalances(tokens, raw, getTokenInfo, codes)
  return { balances, total: sumTokenBalances(balances, codes) }
}
