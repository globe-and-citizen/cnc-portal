import { formatUnits, zeroAddress } from 'viem'
import { SUPPORTED_TOKENS } from '@/constant'
import type { CoinGeckoAssetMarketResponse, CoinGeckoHistoricalResponse } from '@/types/coingecko'
import type { CowOrder, CowTransactionOrders } from '@/types/cow'
import type { SafeClientBalance, SafeIncomingTransfer } from '@/types/safe'
import { assetMarketFromResponse, historicalRateFromResponse } from '@/utils/tokens/coingecko'
import { computeSafeSwapPnl, type SafeSwapPnl } from './swapPnl'
import {
  SAFE_NATIVE_ASSET,
  groupSafeTransfers,
  netSafeTransfers,
  safeTransferAsset
} from './swapTransfers'

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

/** Gateway uses either the native-token type or the zero address for the native coin. */
function balanceAsset({ tokenInfo }: SafeClientBalance): string {
  return tokenInfo.type !== 'ERC20' || tokenInfo.address === zeroAddress
    ? SAFE_NATIVE_ASSET
    : tokenInfo.address.toLowerCase()
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
  const swapHashes = new Set<string>()
  for (const [hash, rows] of groupSafeTransfers(movements)) {
    const sent = new Set<string>()
    const received = new Set<string>()
    for (const row of rows) {
      const direction = row.from.toLowerCase() === address ? sent : received
      direction.add(safeTransferAsset(row))
    }
    if (
      sent.size &&
      received.size &&
      (sent.size > 1 ||
        received.size > 1 ||
        sent.values().next().value !== received.values().next().value)
    )
      swapHashes.add(hash)
  }
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
  const heldAssets = new Set(heldBalances.map(balanceAsset))
  for (const rows of groupSafeTransfers(transfers).values()) {
    for (const [asset, { transfer, amount }] of netSafeTransfers(rows, safeAddress)) {
      if (amount < 0n) request(asset, new Date(transfer.executionDate).toISOString().slice(0, 10))
      else if (amount > 0n && !heldAssets.has(asset)) request(asset, today)
    }
  }
  return [...requests.values()]
}

/** Fee CoW Protocol reports for the Safe's own orders in a swap, in the asset it sold. */
function cowSwapFee(
  transfers: readonly SafeIncomingTransfer[],
  orders: readonly CowOrder[],
  safeAddress: string
) {
  if (!orders.length) return undefined
  const safe = safeAddress.toLowerCase()
  const amounts = netSafeTransfers(transfers, safe)
  const sold = new Map<string, SafeIncomingTransfer>()
  for (const transfer of transfers) {
    if (transfer.type !== 'ERC20_TRANSFER' || transfer.from.toLowerCase() !== safe) continue
    const token = safeTransferAsset(transfer)
    if (!sold.has(token)) sold.set(token, transfer)
  }
  let fee: { asset: string; symbol: string; quantity: number } | undefined
  for (const order of orders) {
    const reported = safeCowOrderFee(order, safe)
    if (!reported) continue
    const token = reported.token.toLowerCase()
    const transfer = sold.get(token)
    if (!transfer || (amounts.get(token)?.amount ?? 0n) >= 0n) continue
    const quantity = Number(formatUnits(BigInt(reported.amount), transfer.tokenInfo!.decimals))
    if (!fee) fee = { asset: token, symbol: transfer.tokenInfo?.symbol ?? 'Unknown', quantity }
    else if (fee.asset === token) fee.quantity += quantity
  }
  return fee
}

/** Value the swaps from their sources; a missing quote or fee stays visible instead of reading as zero. */
export function buildSafeSwapReport(
  transfers: readonly SafeIncomingTransfer[],
  sources: SafeSwapValuationSources
): SafeSwapPnl {
  const rates = new Map<string, CoinGeckoHistoricalResponse | undefined>()
  for (const { coinId, date, data } of sources.rates) {
    const key = `${coinId}:${date}`
    if (!rates.has(key)) rates.set(key, data)
  }
  const balances = new Map<string, SafeClientBalance>()
  for (const balance of sources.heldBalances) {
    const asset = balanceAsset(balance)
    if (!balances.has(asset)) balances.set(asset, balance)
  }
  const orders = new Map<string, readonly CowOrder[]>()
  for (const { txHash, data } of sources.orders) {
    if (!orders.has(txHash)) orders.set(txHash, data ?? [])
  }
  const priceOn = (asset: string, date: string) => {
    const coinId = sources.coinIds.get(asset)
    if (!coinId) return undefined
    if (STABLE_COIN_IDS.has(coinId)) return 1
    const body = rates.get(`${coinId}:${date}`)
    if (!body) return undefined
    try {
      return historicalRateFromResponse(body, coinId, date)
    } catch {
      return undefined
    }
  }
  const priceNow = (asset: string) => {
    if (STABLE_COIN_IDS.has(sources.coinIds.get(asset) ?? '')) return 1
    const price = Number(balances.get(asset)?.fiatConversion)
    return Number.isFinite(price) && price > 0 ? price : priceOn(asset, sources.today)
  }
  return computeSafeSwapPnl(
    transfers,
    sources.safeAddress,
    { on: priceOn, now: priceNow },
    (rows) => cowSwapFee(rows, orders.get(rows[0]!.transactionHash) ?? [], sources.safeAddress)
  )
}
