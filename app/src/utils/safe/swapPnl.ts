import { formatUnits } from 'viem'
import { NETWORK } from '@/constant'
import type { SafeIncomingTransfer } from '@/types/safe'

/** Key of the chain's native coin; ERC-20 assets are keyed by lower-case contract address. */
export const SAFE_NATIVE_ASSET = 'native'

export interface SafeSwapLeg {
  asset: string
  symbol: string
  decimals: number
  quantity: number
}

/** A transaction in which the Safe sent some assets and received different ones. */
export interface SafeSwap {
  txHash: string
  /** UTC day of execution, `YYYY-MM-DD`. */
  date: string
  given: SafeSwapLeg[]
  received: SafeSwapLeg[]
}

export interface SafeSwapPnl {
  count: number
  /** USD value of the assets given up, at the price of each swap's day. */
  swappedUsd: number
  /** USD value today of the assets received. */
  currentUsd: number
  pnlUsd: number
  /** P&L divided by the swapped value; null when nothing was valued. */
  pnlRatio: number | null
  /** Total of the reported swap fees; null when no swap reports its fee. */
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

/** Fee of one swap, expressed as a quantity of one of the assets it gave up. */
export type SafeSwapFeeOf = (swap: SafeSwap) => Omit<SafeSwapLeg, 'decimals'> | undefined

const TOLERANCE = 1e-12

/**
 * Find the Safe's swaps in its transfer history: every transaction that both sends and receives
 * fungible assets. Legs of the same asset are netted, so a refund of the sold asset is not a trade.
 */
export function toSafeSwaps(
  transfers: readonly SafeIncomingTransfer[],
  safeAddress: string
): SafeSwap[] {
  const safe = safeAddress.toLowerCase()
  const transactions = new Map<
    string,
    { date: string; block: number; legs: Map<string, SafeSwapLeg> }
  >()
  for (const transfer of transfers) {
    const leg = legOf(transfer, safe)
    if (!leg) continue
    const transaction = transactions.get(transfer.transactionHash) ?? {
      date: new Date(transfer.executionDate).toISOString().slice(0, 10),
      block: transfer.blockNumber,
      legs: new Map<string, SafeSwapLeg>()
    }
    const known = transaction.legs.get(leg.asset)
    transaction.legs.set(
      leg.asset,
      known ? { ...known, quantity: known.quantity + leg.quantity } : leg
    )
    transactions.set(transfer.transactionHash, transaction)
  }
  return [...transactions.entries()]
    .sort(([, left], [, right]) => left.block - right.block)
    .flatMap(([txHash, { date, legs }]) => {
      const all = [...legs.values()]
      const given = all
        .filter(({ quantity }) => quantity < -TOLERANCE)
        .map((leg) => ({ ...leg, quantity: -leg.quantity }))
      const received = all.filter(({ quantity }) => quantity > TOLERANCE)
      return given.length && received.length ? [{ txHash, date, given, received }] : []
    })
}

function legOf(transfer: SafeIncomingTransfer, safe: string): SafeSwapLeg | undefined {
  const incoming = transfer.to.toLowerCase() === safe
  const outgoing = transfer.from.toLowerCase() === safe
  if (transfer.type === 'ERC721_TRANSFER' || incoming === outgoing) return undefined
  const native = transfer.type === 'ETHER_TRANSFER'
  const asset = native ? SAFE_NATIVE_ASSET : transfer.tokenAddress?.toLowerCase()
  const decimals = native ? 18 : transfer.tokenInfo?.decimals
  if (!asset || decimals === undefined || !/^\d+$/.test(transfer.value)) return undefined
  const amount = Number(formatUnits(BigInt(transfer.value), decimals))
  if (!(amount > 0)) return undefined
  return {
    asset,
    symbol: native ? NETWORK.currencySymbol : (transfer.tokenInfo?.symbol ?? 'Unknown'),
    decimals,
    quantity: incoming ? amount : -amount
  }
}

/** Compare what the swaps gave up, valued on their day, with what the assets received are worth today. */
export function computeSafeSwapPnl(
  swaps: readonly SafeSwap[],
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
  for (const swap of swaps) {
    for (const leg of swap.given)
      swappedUsd += leg.quantity * priced(leg.symbol, prices.on(leg.asset, swap.date))
    for (const leg of swap.received)
      currentUsd += leg.quantity * priced(leg.symbol, prices.now(leg.asset))
    const fee = feeOf(swap)
    if (!fee) continue
    feesReported += 1
    feesUsd += fee.quantity * priced(fee.symbol, prices.on(fee.asset, swap.date))
  }
  const pnlUsd = currentUsd - swappedUsd
  return {
    count: swaps.length,
    swappedUsd,
    currentUsd,
    pnlUsd,
    pnlRatio: swappedUsd > 0 ? pnlUsd / swappedUsd : null,
    feesUsd: feesReported ? feesUsd : null,
    feesReported,
    missingPrices: [...missing].sort()
  }
}
