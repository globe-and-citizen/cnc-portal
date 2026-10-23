import { formatUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import type { CowOrder } from '@/types/cow'
import type { SafeClientBalance, SafeIncomingTransfer } from '@/types/safe'
import { assetMarketFromResponse, historicalRateFromResponse } from '@/utils/tokens/coingecko'
import { SAFE_NATIVE_ASSET, computeSafeSwapPnl, type SafeSwapPnl } from './swapPnl'

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
  /** Original Gateway balance rows with a current USD price. */
  heldBalances: readonly SafeClientBalance[]
  rates: readonly { coinId: string; date: string; data?: CoinGeckoHistoricalResponse }[]
  orders: readonly { txHash: string; data?: CowOrder[] }[]
}

/** ERC-20 contracts of the swaps that need a market identity lookup. */
export function safeSwapContracts(transfers: readonly SafeIncomingTransfer[]): string[] {
  return [
    ...new Set(
      transfers
        .filter(({ type }) => type === 'ERC20_TRANSFER')
        .map(({ tokenAddress }) => tokenAddress!.toLowerCase())
    )
  ].filter((asset) => !SUPPORTED_COIN_IDS.has(asset))
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
  transfers: readonly SafeIncomingTransfer[],
  safeAddress: string,
  coinIds: ReadonlyMap<string, string>,
  heldBalances: readonly SafeClientBalance[],
  today: string
): { coinId: string; date: string }[] {
  const requests = new Map<string, { coinId: string; date: string }>()
  const request = (asset: string, date: string) => {
    const coinId = coinIds.get(asset)
    if (coinId && !STABLE_COIN_IDS.has(coinId)) requests.set(`${coinId}:${date}`, { coinId, date })
  }
  const safe = safeAddress.toLowerCase()
  for (const transfer of transfers) {
    const asset =
      transfer.type === 'ETHER_TRANSFER' ? SAFE_NATIVE_ASSET : transfer.tokenAddress!.toLowerCase()
    const net = transfers
      .filter(
        (row) =>
          row.transactionHash === transfer.transactionHash &&
          (row.type === 'ETHER_TRANSFER' ? SAFE_NATIVE_ASSET : row.tokenAddress!.toLowerCase()) ===
            asset
      )
      .reduce(
        (sum, row) => sum + BigInt(row.value) * (row.to.toLowerCase() === safe ? 1n : -1n),
        0n
      )
    if (net < 0n) request(asset, new Date(transfer.executionDate).toISOString().slice(0, 10))
    else if (
      net > 0n &&
      !heldBalances.some(
        ({ tokenInfo }) =>
          (tokenInfo.type !== 'ERC20' || tokenInfo.address === zeroAddress
            ? SAFE_NATIVE_ASSET
            : tokenInfo.address.toLowerCase()) === asset
      )
    )
      request(asset, today)
  }
  return [...requests.values()]
}

/** Fee CoW Protocol reports for the Safe's own orders in a swap, in the asset it sold. */
function cowSwapFee(
  transfers: readonly SafeIncomingTransfer[],
  orders: readonly CowOrder[],
  safeAddress: string
) {
  const safe = safeAddress.toLowerCase()
  let fee: { asset: string; symbol: string; quantity: number } | undefined
  for (const order of orders) {
    const token = order.executedFeeToken?.toLowerCase()
    const transfer = transfers.find(
      ({ type, tokenAddress, from }) =>
        type === 'ERC20_TRANSFER' &&
        tokenAddress?.toLowerCase() === token &&
        from.toLowerCase() === safe
    )
    if (order.owner.toLowerCase() !== safe || order.status !== 'fulfilled') continue
    if (!transfer || !order.executedFee || !/^\d+$/.test(order.executedFee)) continue
    const net = transfers
      .filter(({ tokenAddress }) => tokenAddress?.toLowerCase() === token)
      .reduce(
        (sum, row) => sum + BigInt(row.value) * (row.to.toLowerCase() === safe ? 1n : -1n),
        0n
      )
    if (net >= 0n) continue
    const quantity = Number(formatUnits(BigInt(order.executedFee), transfer.tokenInfo!.decimals))
    fee =
      fee && fee.asset === token
        ? { ...fee, quantity: fee.quantity + quantity }
        : (fee ?? { asset: token!, symbol: transfer.tokenInfo?.symbol ?? 'Unknown', quantity })
  }
  return fee
}

/** Value the swaps from their sources; a missing quote or fee stays visible instead of reading as zero. */
export function buildSafeSwapReport(
  transfers: readonly SafeIncomingTransfer[],
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
  const priceNow = (asset: string) => {
    if (STABLE_COIN_IDS.has(sources.coinIds.get(asset) ?? '')) return 1
    const held = sources.heldBalances.find(
      ({ tokenInfo }) =>
        (tokenInfo.type !== 'ERC20' || tokenInfo.address === zeroAddress
          ? SAFE_NATIVE_ASSET
          : tokenInfo.address.toLowerCase()) === asset
    )
    const price = Number(held?.fiatConversion)
    return Number.isFinite(price) && price > 0 ? price : priceOn(asset, sources.today)
  }
  return computeSafeSwapPnl(
    transfers,
    sources.safeAddress,
    { on: priceOn, now: priceNow },
    (rows) =>
      cowSwapFee(
        rows,
        sources.orders.find(({ txHash }) => txHash === rows[0]!.transactionHash)?.data ?? [],
        sources.safeAddress
      )
  )
}
