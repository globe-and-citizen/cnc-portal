import { formatUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import type { CowOrder, CowTransactionOrders } from '@/types/cow'
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
  orders: readonly CowTransactionOrders[]
}

/**
 * The Safe's movements in its swaps: transactions in which it sent one asset and received
 * another. NFT, self, zero and unknown-decimals movements are left out.
 */
export function safeSwapTransfers(
  transfers: readonly SafeIncomingTransfer[] | null | undefined,
  safeAddress: string | null | undefined
): SafeIncomingTransfer[] {
  const address = safeAddress?.toLowerCase()
  if (!address) return []
  const movements = (transfers ?? []).filter(
    ({ type, from, to, value, tokenAddress, tokenInfo }) =>
      type !== 'ERC721_TRANSFER' &&
      (from.toLowerCase() === address) !== (to.toLowerCase() === address) &&
      (type === 'ETHER_TRANSFER' || (!!tokenAddress && tokenInfo?.decimals !== undefined)) &&
      /^\d+$/.test(value) &&
      BigInt(value) > 0n
  )
  const swapHashes = new Set(
    movements
      .filter(
        (sent) =>
          sent.from.toLowerCase() === address &&
          movements.some(
            (received) =>
              received.transactionHash === sent.transactionHash &&
              received.to.toLowerCase() === address &&
              (received.type === 'ETHER_TRANSFER' ? null : received.tokenAddress?.toLowerCase()) !==
                (sent.type === 'ETHER_TRANSFER' ? null : sent.tokenAddress?.toLowerCase())
          )
      )
      .map(({ transactionHash }) => transactionHash)
  )
  return movements.filter(({ transactionHash }) => swapHashes.has(transactionHash))
}

/** Fee CoW Protocol reports for a fulfilled order the Safe owns, in base units of the token it took. */
export function safeCowOrderFee(
  order: CowOrder,
  safeAddress: string
): { token: string; amount: string } | undefined {
  if (order.owner.toLowerCase() !== safeAddress.toLowerCase() || order.status !== 'fulfilled')
    return undefined
  const { executedFee, executedFeeToken } = order
  return executedFeeToken && executedFee && /^\d+$/.test(executedFee)
    ? { token: executedFeeToken, amount: executedFee }
    : undefined
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
    const reported = safeCowOrderFee(order, safe)
    if (!reported) continue
    const token = reported.token.toLowerCase()
    const transfer = transfers.find(
      ({ type, tokenAddress, from }) =>
        type === 'ERC20_TRANSFER' &&
        tokenAddress?.toLowerCase() === token &&
        from.toLowerCase() === safe
    )
    if (!transfer) continue
    const net = transfers
      .filter(({ tokenAddress }) => tokenAddress?.toLowerCase() === token)
      .reduce(
        (sum, row) => sum + BigInt(row.value) * (row.to.toLowerCase() === safe ? 1n : -1n),
        0n
      )
    if (net >= 0n) continue
    const quantity = Number(formatUnits(BigInt(reported.amount), transfer.tokenInfo!.decimals))
    fee =
      fee && fee.asset === token
        ? { ...fee, quantity: fee.quantity + quantity }
        : (fee ?? { asset: token, symbol: transfer.tokenInfo?.symbol ?? 'Unknown', quantity })
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
