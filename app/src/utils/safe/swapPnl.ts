import { formatUnits } from 'viem'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'

/** Key of the chain's native coin; ERC-20 assets are keyed by lower-case contract address. */
export const SAFE_NATIVE_ASSET = 'native'

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
  /** Market result of each swap, excluding its reported fee, in chain order; they add up to the P&L. */
  swaps: SafeSwapResult[]
}

export interface SafeSwapResult {
  txHash: string
  pnlUsd: number
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
  const swaps: SafeSwapResult[] = []
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
    count += 1
    const date = new Date(rows[0]!.executionDate).toISOString().slice(0, 10)
    let swapPnlUsd = 0
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
      const valueUsd =
        amount < 0n
          ? -quantity * priced(symbol, prices.on(asset, date))
          : quantity * priced(symbol, prices.now(asset))
      if (amount < 0n) swappedUsd -= valueUsd
      else currentUsd += valueUsd
      swapPnlUsd += valueUsd
    }
    const fee = feeOf(rows)
    if (fee) {
      const feeUsd = fee.quantity * priced(fee.symbol, prices.on(fee.asset, date))
      feesReported += 1
      feesUsd += feeUsd
      swappedUsd -= feeUsd
      swapPnlUsd += feeUsd
    }
    swaps.push({ txHash, pnlUsd: swapPnlUsd })
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
