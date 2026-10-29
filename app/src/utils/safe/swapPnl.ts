import { formatUnits } from 'viem'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'
import { groupSafeTransfers, netSafeTransfers } from './swapTransfers'

export interface SafeSwapPnl {
  count: number
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
  /** Every swap in chain order; their market results add up to the P&L. */
  swaps: SafeSwap[]
}

export interface SafeSwapResult {
  txHash: string
  /** Market result of the swap, excluding its reported fee; an unpriced asset counts as zero. */
  pnlUsd: number
}

/** One asset of a swap: a quantity given up or received, with its USD value. */
export interface SafeSwapLeg {
  asset: string
  symbol: string
  quantity: number
  /** Value on the swap's day for an asset given up, today for one received; null when unpriced. */
  usd: number | null
}

/** One swap with the assets it exchanged, as the Safe's swap table shows it. */
export interface SafeSwap extends SafeSwapResult {
  executionDate: string
  given: SafeSwapLeg[]
  received: SafeSwapLeg[]
  /** Value of the assets given up less the reported fee; null when something is unpriced. */
  swappedUsd: number | null
  /** Value today of the assets received; null when an asset is unpriced. */
  currentUsd: number | null
  /** Reported fee, in the asset it was taken from; null when none is reported. */
  fee: { symbol: string; quantity: number; usd: number | null } | null
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
  const priced = (symbol: string, price: number | undefined) => {
    if (price === undefined) missing.add(symbol)
    return price ?? 0
  }
  let swappedUsd = 0
  let currentUsd = 0
  let feesUsd = 0
  let feesReported = 0
  let count = 0
  const swaps: SafeSwap[] = []
  for (const [txHash, rows] of groupSafeTransfers(transfers)) {
    const amounts = netSafeTransfers(rows, safeAddress)
    const net = [...amounts.values()]
    if (!net.some(({ amount }) => amount < 0n) || !net.some(({ amount }) => amount > 0n)) continue
    count += 1
    const date = new Date(rows[0]!.executionDate).toISOString().slice(0, 10)
    let swapPnlUsd = 0
    const given: SafeSwapLeg[] = []
    const received: SafeSwapLeg[] = []
    for (const [asset, { transfer: row, amount }] of amounts) {
      if (amount === 0n) continue
      const native = row.type === 'ETHER_TRANSFER'
      const symbol = native ? NETWORK.currencySymbol : (row.tokenInfo?.symbol ?? 'Unknown')
      const quantity = Number(
        formatUnits(amount < 0n ? -amount : amount, native ? 18 : row.tokenInfo!.decimals)
      )
      const price = amount < 0n ? prices.on(asset, date) : prices.now(asset)
      const legUsd = quantity * priced(symbol, price)
      const valueUsd = amount < 0n ? -legUsd : legUsd
      if (amount < 0n) swappedUsd -= valueUsd
      else currentUsd += valueUsd
      swapPnlUsd += valueUsd
      ;(amount < 0n ? given : received).push({
        asset,
        symbol,
        quantity,
        usd: price === undefined ? null : legUsd
      })
    }
    const reported = feeOf(rows)
    const feePrice = reported && prices.on(reported.asset, date)
    const feeUsd = reported ? reported.quantity * priced(reported.symbol, feePrice) : 0
    if (reported) {
      feesReported += 1
      feesUsd += feeUsd
      swappedUsd -= feeUsd
      swapPnlUsd += feeUsd
    }
    const isFeeUnpriced = !!reported && feePrice === undefined
    const givenUsd = legsUsd(given)
    swaps.push({
      txHash,
      pnlUsd: swapPnlUsd,
      executionDate: rows[0]!.executionDate,
      given,
      received,
      swappedUsd: givenUsd === null || isFeeUnpriced ? null : givenUsd - feeUsd,
      currentUsd: legsUsd(received),
      fee: reported
        ? {
            symbol: reported.symbol,
            quantity: reported.quantity,
            usd: isFeeUnpriced ? null : feeUsd
          }
        : null
    })
  }
  const pnlUsd = currentUsd - swappedUsd
  return {
    count,
    swappedUsd,
    currentUsd,
    pnlUsd,
    pnlRatio: swappedUsd > 0 ? pnlUsd / swappedUsd : null,
    feesUsd: feesReported ? feesUsd : null,
    feesReported,
    missingPrices: [...missing].sort(),
    swaps
  }
}
