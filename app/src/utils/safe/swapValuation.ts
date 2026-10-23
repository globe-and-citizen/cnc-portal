import { formatUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import type { CowOrder } from '@/types/cow'
import type { SafeClientBalances } from '@/types/safe'
import { assetMarketFromResponse, historicalRateFromResponse } from '@/utils/tokens/coingecko'
import { SAFE_NATIVE_ASSET, computeSafeSwapPnl, type SafeSwap, type SafeSwapPnl } from './swapPnl'

/** CoinGecko identities valued at their $1 peg instead of a market quote. */
const STABLE_COIN_IDS = new Set(['usd-coin', 'tether', 'dai'])

const SUPPORTED_COIN_IDS = new Map(
  SUPPORTED_TOKENS.filter(({ coingeckoId }) => coingeckoId !== 'unknown').map((token) => [
    token.address === zeroAddress ? SAFE_NATIVE_ASSET : token.address.toLowerCase(),
    token.coingeckoId
  ])
)

export interface SafeSwapValuationSources {
  safeAddress: string
  /** UTC day used for today's quote, `YYYY-MM-DD`. */
  today: string
  coinIds: ReadonlyMap<string, string>
  /** Current USD price of each asset the Safe holds. */
  heldPrices: ReadonlyMap<string, number>
  rates: readonly { coinId: string; date: string; data?: CoinGeckoHistoricalResponse }[]
  orders: readonly { txHash: string; data?: CowOrder[] }[]
}

/** Current USD price of every held asset the Gateway values. */
export function safeHeldPrices(data?: SafeClientBalances): Map<string, number> {
  const prices = new Map<string, number>()
  for (const { tokenInfo, fiatConversion } of data?.items ?? []) {
    const price = Number(fiatConversion)
    if (fiatConversion === null || !Number.isFinite(price) || price <= 0) continue
    const native = tokenInfo.type !== 'ERC20' || tokenInfo.address === zeroAddress
    prices.set(native ? SAFE_NATIVE_ASSET : tokenInfo.address.toLowerCase(), price)
  }
  return prices
}

/** ERC-20 contracts of the swaps that need a market identity lookup. */
export function safeSwapContracts(swaps: readonly SafeSwap[]): string[] {
  const assets = swaps.flatMap(({ given, received }) => [...given, ...received])
  return [...new Set(assets.map(({ asset }) => asset))].filter(
    (asset) => asset !== SAFE_NATIVE_ASSET && !SUPPORTED_COIN_IDS.has(asset)
  )
}

/** Map every valued asset to its CoinGecko identity; a contract whose metadata does not match stays unvalued. */
export function safeSwapCoinIds(
  markets: readonly { address: string; data?: CoinGeckoAssetMarketResponse }[]
): Map<string, string> {
  const coinIds = new Map(SUPPORTED_COIN_IDS)
  for (const { address, data } of markets) {
    if (!data) continue
    try {
      coinIds.set(address.toLowerCase(), assetMarketFromResponse(data, address).coinId)
    } catch {
      continue
    }
  }
  return coinIds
}

/**
 * Daily quotes needed: each asset given up on its swap day, and today's quote for a received
 * asset the Safe no longer holds. Pegged stablecoins need none.
 */
export function safeSwapRateRequests(
  swaps: readonly SafeSwap[],
  coinIds: ReadonlyMap<string, string>,
  heldPrices: ReadonlyMap<string, number>,
  today: string
): { coinId: string; date: string }[] {
  const requests = new Map<string, { coinId: string; date: string }>()
  const request = (asset: string, date: string) => {
    const coinId = coinIds.get(asset)
    if (coinId && !STABLE_COIN_IDS.has(coinId)) requests.set(`${coinId}:${date}`, { coinId, date })
  }
  for (const { date, given, received } of swaps) {
    for (const { asset } of given) request(asset, date)
    for (const { asset } of received) if (!heldPrices.has(asset)) request(asset, today)
  }
  return [...requests.values()]
}

/** Fee CoW Protocol reports for the Safe's own orders in a swap, in the asset it sold. */
function cowSwapFee(swap: SafeSwap, orders: readonly CowOrder[], safeAddress: string) {
  const safe = safeAddress.toLowerCase()
  let fee: { asset: string; symbol: string; quantity: number } | undefined
  for (const order of orders) {
    const token = order.executedFeeToken?.toLowerCase()
    const leg = swap.given.find(({ asset }) => asset === token)
    if (order.owner.toLowerCase() !== safe || order.status !== 'fulfilled') continue
    if (!leg || !order.executedFee || !/^\d+$/.test(order.executedFee)) continue
    const quantity = Number(formatUnits(BigInt(order.executedFee), leg.decimals))
    fee =
      fee && fee.asset === leg.asset
        ? { ...fee, quantity: fee.quantity + quantity }
        : (fee ?? { asset: leg.asset, symbol: leg.symbol, quantity })
  }
  return fee
}

/** Value the swaps from their sources; a missing quote or fee stays visible instead of reading as zero. */
export function buildSafeSwapReport(
  swaps: readonly SafeSwap[],
  sources: SafeSwapValuationSources
): SafeSwapPnl {
  const priceOn = (asset: string, date: string) => {
    const coinId = sources.coinIds.get(asset)
    if (!coinId) return undefined
    if (STABLE_COIN_IDS.has(coinId)) return 1
    const body = sources.rates.find((rate) => rate.coinId === coinId && rate.date === date)?.data
    if (!body) return undefined
    try {
      return historicalRateFromResponse(body, coinId, date)
    } catch {
      return undefined
    }
  }
  const priceNow = (asset: string) =>
    STABLE_COIN_IDS.has(sources.coinIds.get(asset) ?? '')
      ? 1
      : (sources.heldPrices.get(asset) ?? priceOn(asset, sources.today))
  return computeSafeSwapPnl(swaps, { on: priceOn, now: priceNow }, (swap) =>
    cowSwapFee(
      swap,
      sources.orders.find(({ txHash }) => txHash === swap.txHash)?.data ?? [],
      sources.safeAddress
    )
  )
}
