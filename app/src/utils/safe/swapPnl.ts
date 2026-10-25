import { formatUnits } from 'viem'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'

/** Key of the chain's native coin; ERC-20 assets are keyed by lower-case contract address. */
export const SAFE_NATIVE_ASSET = 'native'

/** One asset of a swap: a quantity given up or received, with its USD value. */
export interface SafeSwapLeg {
  asset: string
  symbol: string
  quantity: number
  /** Value on the swap's day for an asset given up, today for one received; null when unpriced. */
  usd: number | null
}

/** One swap transaction, as the Safe's swap table shows it. */
export interface SafeSwap {
  txHash: string
  executionDate: string
  given: SafeSwapLeg[]
  received: SafeSwapLeg[]
  /** Value of the assets given up less the reported fee; null when something is unpriced. */
  swappedUsd: number | null
  /** Value today of the assets received; null when an asset is unpriced. */
  currentUsd: number | null
  pnlUsd: number | null
  /** Reported fee, in the asset it was taken from; null when none is reported. */
  fee: { symbol: string; quantity: number; usd: number | null } | null
}

export interface SafeSwapPnl {
  count: number
  /** Every swap, newest first. */
  swaps: SafeSwap[]
  /** USD value of the assets given up, at the price of each swap's day, less the reported fees. */
  swappedUsd: number
  /** USD value today of the assets received. */
  currentUsd: number
  /** Market result of the swaps, excluding the reported fees. */
  pnlUsd: number
  /** P&L divided by the swapped value; null when nothing was valued. */
  pnlRatio: number | null
  /**
   * Total of the reported swap fees, kept apart from the P&L like the Transaction Fee Expense
   * account; null when no swap reports its fee.
   */
  feesUsd: number | null
  /** Number of swaps whose fee is reported. */
  feesReported: number
  /** Symbols that could not be priced, so the figures are incomplete. */
  missingPrices: string[]
}

export interface SafeSwapPrices {
  /** USD price on a UTC day. */
  on: (asset: string, date: string) => number | undefined
  /** USD price today. */
  now: (asset: string) => number | undefined
}

/** Fee of one transaction, expressed as a quantity of an asset it gave up. */
export type SafeSwapFeeOf = (
  transfers: readonly SafeIncomingTransfer[]
) => { asset: string; symbol: string; quantity: number } | undefined

/** Sum of the legs' USD values; null as soon as one is unpriced. */
const legsUsd = (legs: readonly SafeSwapLeg[]) =>
  legs.some(({ usd }) => usd === null) ? null : legs.reduce((sum, { usd }) => sum + usd!, 0)

/**
 * Compare what the swaps gave up, valued on their day, with what the assets received are worth
 * today. A reported fee is taken out of the amount given up so the P&L excludes it.
 */
export function computeSafeSwapPnl(
  transfers: readonly SafeIncomingTransfer[],
  safeAddress: string,
  prices: SafeSwapPrices,
  feeOf: SafeSwapFeeOf
): SafeSwapPnl {
  const missing = new Set<string>()
  const priced = (symbol: string, quantity: number, price: number | undefined) => {
    if (price === undefined) missing.add(symbol)
    return price === undefined ? null : quantity * price
  }
  const swaps: SafeSwap[] = []
  let feesUsd = 0
  let feesReported = 0
  const safe = safeAddress.toLowerCase()
  for (const txHash of new Set(transfers.map(({ transactionHash }) => transactionHash))) {
    const rows = transfers.filter(({ transactionHash }) => transactionHash === txHash)
    const amounts = new Map<string, bigint>()
    for (const row of rows) {
      const asset =
        row.type === 'ETHER_TRANSFER' ? SAFE_NATIVE_ASSET : row.tokenAddress!.toLowerCase()
      const amount = BigInt(row.value) * (row.to.toLowerCase() === safe ? 1n : -1n)
      amounts.set(asset, (amounts.get(asset) ?? 0n) + amount)
    }
    const net = [...amounts.values()]
    if (!net.some((amount) => amount < 0n) || !net.some((amount) => amount > 0n)) continue
    const date = new Date(rows[0]!.executionDate).toISOString().slice(0, 10)
    const given: SafeSwapLeg[] = []
    const received: SafeSwapLeg[] = []
    for (const [asset, amount] of amounts) {
      if (amount === 0n) continue
      const row = rows.find(
        (transfer) =>
          (transfer.type === 'ETHER_TRANSFER'
            ? SAFE_NATIVE_ASSET
            : transfer.tokenAddress!.toLowerCase()) === asset
      )!
      const native = row.type === 'ETHER_TRANSFER'
      const symbol = native ? NETWORK.currencySymbol : (row.tokenInfo?.symbol ?? 'Unknown')
      const quantity = Number(
        formatUnits(amount < 0n ? -amount : amount, native ? 18 : row.tokenInfo!.decimals)
      )
      if (amount < 0n)
        given.push({
          asset,
          symbol,
          quantity,
          usd: priced(symbol, quantity, prices.on(asset, date))
        })
      else
        received.push({ asset, symbol, quantity, usd: priced(symbol, quantity, prices.now(asset)) })
    }
    const reported = feeOf(rows)
    const fee = reported && {
      symbol: reported.symbol,
      quantity: reported.quantity,
      usd: priced(reported.symbol, reported.quantity, prices.on(reported.asset, date))
    }
    if (fee) {
      feesReported += 1
      feesUsd += fee.usd ?? 0
    }
    const givenUsd = legsUsd(given)
    const swappedUsd = givenUsd === null || fee?.usd === null ? null : givenUsd - (fee?.usd ?? 0)
    const currentUsd = legsUsd(received)
    swaps.push({
      txHash,
      executionDate: rows[0]!.executionDate,
      given,
      received,
      swappedUsd,
      currentUsd,
      pnlUsd: swappedUsd === null || currentUsd === null ? null : currentUsd - swappedUsd,
      fee: fee ?? null
    })
  }
  const total = (pick: (swap: SafeSwap) => readonly SafeSwapLeg[]) =>
    swaps.reduce((sum, swap) => sum + pick(swap).reduce((legs, { usd }) => legs + (usd ?? 0), 0), 0)
  const swappedUsd = total(({ given }) => given) - feesUsd
  const pnlUsd = total(({ received }) => received) - swappedUsd
  return {
    count: swaps.length,
    swaps: swaps.sort(
      (a, b) => new Date(b.executionDate).getTime() - new Date(a.executionDate).getTime()
    ),
    swappedUsd,
    currentUsd: total(({ received }) => received),
    pnlUsd,
    pnlRatio: swappedUsd > 0 ? pnlUsd / swappedUsd : null,
    feesUsd: feesReported ? feesUsd : null,
    feesReported,
    missingPrices: [...missing].sort()
  }
}
