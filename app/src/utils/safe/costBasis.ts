import type { SafeIncomingTransfer } from '@/types/safe'
import type { SafeSwapFeeOf, SafeSwapPrices } from './swapPnl'
import {
  groupSafeTransfers,
  safeDayOf,
  safeTransactionLegs,
  type SafeAssetAmount,
  type SafeTransactionLeg
} from './swapTransfers'

/** One swap: what the Safe gave and received, fee excluded, and what the exchange was worth. */
export interface SafeSwapExchange {
  txHash: string
  executionDate: string
  given: SafeAssetAmount[]
  received: SafeAssetAmount[]
  /** USD value on the swap's day: its stablecoin side, else the side given; null when unpriced. */
  valueUsd: number | null
  /** Reported fee, in the asset it was taken from; null when none is reported. */
  fee: (SafeAssetAmount & { usd: number | null }) | null
}

/** One movement of a token, with the quantity it leaves held. */
export interface SafeCostBasisEvent {
  txHash: string
  executionDate: string
  /** Through a swap, a plain transfer in or out, or a swap fee. */
  kind: 'swap' | 'received' | 'sent' | 'fee'
  /** The exchange, for a swap event. */
  swap: SafeSwapExchange | null
  quantity: number
  /** USD price per token the movement was valued at; null when unpriced. */
  priceUsd: number | null
  quantityHeld: number
  /** Gain or loss of a movement out of the Safe; null for an entry, a fee or an unpriced exit. */
  pnlUsd: number | null
}

/** A token the swaps touched, tracked at its weighted average cost. */
export interface SafeTokenPosition {
  asset: string
  symbol: string
  quantity: number
  /** Cost of the quantity still held; null when an entry was unpriced. */
  costUsd: number | null
  averageCostUsd: number | null
  /** Price today; null when nothing is held or no quote is available. */
  priceUsd: number | null
  /** Worth today of the quantity still held; null when it cannot be priced. */
  valueUsd: number | null
  /**
   * What left the Safe, valued on the day it left, plus what remains, valued today, against its
   * average cost; null when a price or part of the history is missing.
   */
  pnlUsd: number | null
  history: SafeCostBasisEvent[]
}

export interface SafeCostBasis {
  count: number
  /** Sum of the tokens' P&L, fees excluded; a token that cannot be valued is left out. */
  pnlUsd: number
  /** P&L divided by the value of the swaps; null when no swap was valued. */
  pnlRatio: number | null
  /** Total of the reported fees, kept out of the P&L; null when no swap reports one. */
  feesUsd: number | null
  /** Tokens whose P&L could not be valued, so the total is incomplete. */
  unvaluedTokens: string[]
  /** Tokens still held first. */
  positions: SafeTokenPosition[]
  /** Swaps in chain order. */
  swaps: SafeSwapExchange[]
}

interface SafeCostBasisSources {
  safeAddress: string
  /** Transactions in which the Safe swapped. */
  swapHashes: ReadonlySet<string>
  prices: SafeSwapPrices
  /** Pegged stablecoins are worth $1 and keep a $1 average cost. */
  isStable: (asset: string) => boolean
  feeOf: SafeSwapFeeOf
}

interface Transaction {
  txHash: string
  executionDate: string
  rows: SafeIncomingTransfer[]
  legs: SafeTransactionLeg[]
}

interface Position {
  asset: string
  symbol: string
  quantity: number
  costUsd: number | null
  realizedUsd: number | null
  history: SafeCostBasisEvent[]
}

/** A remainder this small is rounding noise: the position counts as emptied. */
const DUST = 1e-9

const total = (values: readonly (number | null)[]) =>
  values.some((value) => value === null)
    ? null
    : values.reduce<number>((sum, value) => sum + value!, 0)

const knownTotal = (values: readonly (number | null)[]) =>
  total(values.filter((value) => value !== null))!

/**
 * Track every token the swaps touched at its weighted average cost, through all its movements in
 * the Safe: a swap, a deposit or a payment. What leaves is valued on its day and stays fixed;
 * what remains is valued today. Fees are kept apart and never enter the P&L.
 */
export function computeSafeCostBasis(
  movements: readonly SafeIncomingTransfer[],
  sources: SafeCostBasisSources
): SafeCostBasis {
  const transactions = chronologicalTransactions(movements, sources.safeAddress)
  const swapTransactions = transactions.filter(({ txHash }) => sources.swapHashes.has(txHash))
  const tracked = new Set(swapTransactions.flatMap(({ legs }) => legs.map(({ asset }) => asset)))
  const ledger = createLedger(sources)
  const swaps: SafeSwapExchange[] = []
  for (const transaction of transactions) {
    if (sources.swapHashes.has(transaction.txHash)) swaps.push(ledger.swap(transaction))
    else
      for (const leg of transaction.legs) {
        if (tracked.has(leg.asset)) ledger.transfer(transaction, leg)
      }
  }
  return summarize(ledger.positions(), swaps)
}

/** Oldest first; the service lists the newest first, so reversing keeps on-chain order in a block. */
function chronologicalTransactions(
  movements: readonly SafeIncomingTransfer[],
  safeAddress: string
): Transaction[] {
  return [...groupSafeTransfers([...movements].reverse())]
    .map(([txHash, rows]) => ({
      txHash,
      executionDate: rows[0]!.executionDate,
      rows,
      legs: safeTransactionLegs(rows, safeAddress)
    }))
    .sort((a, b) => a.rows[0]!.blockNumber - b.rows[0]!.blockNumber)
}

function createLedger({ prices, isStable, feeOf }: SafeCostBasisSources) {
  const positions = new Map<string, Position>()

  const positionOf = ({ asset, symbol }: SafeAssetAmount) => {
    if (!positions.has(asset))
      positions.set(asset, { asset, symbol, quantity: 0, costUsd: 0, realizedUsd: 0, history: [] })
    return positions.get(asset)!
  }
  const priceOn = ({ asset }: SafeAssetAmount, day: string) =>
    isStable(asset) ? 1 : (prices.on(asset, day) ?? null)
  const dayValue = (amount: SafeAssetAmount, day: string) => {
    const price = priceOn(amount, day)
    return price === null ? null : price * amount.quantity
  }
  /** Split a value across amounts by their worth that day; one amount takes it all. */
  const prorate = (value: number | null, amounts: readonly SafeAssetAmount[], day: string) => {
    if (amounts.length === 1) return [value]
    const weights = amounts.map((amount) => dayValue(amount, day))
    const weightTotal = total(weights)
    return weights.map((weight) =>
      value === null || weightTotal === null || !weightTotal
        ? null
        : (value * weight!) / weightTotal
    )
  }
  const record = (position: Position, event: Omit<SafeCostBasisEvent, 'quantityHeld'>) =>
    position.history.push({ ...event, quantityHeld: position.quantity })

  /** Value an exchange from its stablecoin side, else from the side given, fee already excluded. */
  const exchangeValue = (given: SafeAssetAmount[], received: SafeAssetAmount[], day: string) => {
    const isStableSide = (side: SafeAssetAmount[]) =>
      side.length > 0 && side.every(({ asset }) => isStable(asset))
    if (isStableSide(received)) return knownTotal(received.map(({ quantity }) => quantity))
    if (isStableSide(given)) return knownTotal(given.map(({ quantity }) => quantity))
    return total(given.map((amount) => dayValue(amount, day)))
  }

  /** A stablecoin enters at $1; the rest of the exchange value is shared by the other assets. */
  const entryCosts = (received: SafeAssetAmount[], valueUsd: number | null, day: string) => {
    const volatile = received.filter(({ asset }) => !isStable(asset))
    const stableUsd = knownTotal(
      received.filter(({ asset }) => isStable(asset)).map(({ quantity }) => quantity)
    )
    const volatileCosts = prorate(valueUsd === null ? null : valueUsd - stableUsd, volatile, day)
    return received.map((amount) =>
      isStable(amount.asset) ? amount.quantity : volatileCosts[volatile.indexOf(amount)]!
    )
  }

  const swap = ({ txHash, executionDate, rows, legs }: Transaction): SafeSwapExchange => {
    const day = safeDayOf(executionDate)
    const reported = feeOf(rows)
    const given = legs
      .filter(({ isReceived }) => !isReceived)
      .map((leg) => exchangedAmount(leg, reported))
      .filter(({ quantity }) => quantity > DUST)
    const received = legs.filter(({ isReceived }) => isReceived).map(amountOf)
    const valueUsd = exchangeValue(given, received, day)
    const feePrice = reported ? priceOn(reported, day) : null
    const exchange: SafeSwapExchange = {
      txHash,
      executionDate,
      given,
      received,
      valueUsd,
      fee: reported
        ? { ...amountOf(reported), usd: feePrice === null ? null : feePrice * reported.quantity }
        : null
    }
    const event = { txHash, executionDate, kind: 'swap' as const, swap: exchange }
    prorate(valueUsd, given, day).forEach((proceeds, index) => {
      const { quantity } = given[index]!
      const position = positionOf(given[index]!)
      const pnlUsd = realize(position, proceeds, leave(position, quantity))
      const priceUsd = proceeds === null ? null : proceeds / quantity
      record(position, { ...event, quantity, priceUsd, pnlUsd })
    })
    if (reported) {
      const position = positionOf(reported)
      leave(position, reported.quantity)
      record(position, {
        ...event,
        kind: 'fee',
        quantity: reported.quantity,
        priceUsd: feePrice,
        pnlUsd: null
      })
    }
    entryCosts(received, valueUsd, day).forEach((costUsd, index) => {
      const { quantity } = received[index]!
      const position = positionOf(received[index]!)
      enter(position, quantity, costUsd)
      const priceUsd = costUsd === null ? null : costUsd / quantity
      record(position, { ...event, quantity, priceUsd, pnlUsd: null })
    })
    return exchange
  }

  /** A deposit enters at its day's price; a payment leaves at it and fixes its P&L. */
  const transfer = ({ txHash, executionDate }: Transaction, leg: SafeTransactionLeg) => {
    const position = positionOf(leg)
    const priceUsd = priceOn(leg, safeDayOf(executionDate))
    const valueUsd = priceUsd === null ? null : priceUsd * leg.quantity
    const event = { txHash, executionDate, swap: null, quantity: leg.quantity, priceUsd }
    if (leg.isReceived) {
      enter(position, leg.quantity, valueUsd)
      record(position, { ...event, kind: 'received', pnlUsd: null })
    } else {
      const pnlUsd = realize(position, valueUsd, leave(position, leg.quantity))
      record(position, { ...event, kind: 'sent', pnlUsd })
    }
  }

  const close = (position: Position): SafeTokenPosition => {
    const { asset, symbol, quantity, costUsd, realizedUsd, history } = position
    const isHeld = quantity > 0
    const priceUsd = !isHeld ? null : isStable(asset) ? 1 : (prices.now(asset) ?? null)
    const valueUsd = priceUsd === null ? (isHeld ? null : 0) : priceUsd * quantity
    const pnlUsd = total([realizedUsd, valueUsd, costUsd === null ? null : -costUsd])
    return {
      asset,
      symbol,
      quantity,
      costUsd,
      averageCostUsd: averageCost(position),
      priceUsd,
      valueUsd: isHeld ? valueUsd : null,
      pnlUsd,
      history
    }
  }

  return {
    swap,
    transfer,
    positions: () => [...positions.values()].map(close)
  }
}

function amountOf({ asset, symbol, quantity }: SafeAssetAmount): SafeAssetAmount {
  return { asset, symbol, quantity }
}

/** The part of an asset given that was exchanged: a fee taken from it is not. */
function exchangedAmount(
  leg: SafeTransactionLeg,
  fee: SafeAssetAmount | undefined
): SafeAssetAmount {
  const quantity = leg.asset === fee?.asset ? leg.quantity - fee.quantity : leg.quantity
  return { ...amountOf(leg), quantity }
}

function averageCost({ quantity, costUsd }: Position): number | null {
  return quantity > 0 && costUsd !== null ? costUsd / quantity : null
}

function enter(position: Position, quantity: number, costUsd: number | null) {
  position.quantity += quantity
  position.costUsd =
    position.costUsd === null || costUsd === null ? null : position.costUsd + costUsd
}

/**
 * Take a quantity out at its average cost and return that cost. Taking more than the history
 * shows held means part of the history is missing: the token can no longer be valued. An emptied
 * position starts again from its next entry.
 */
function leave(position: Position, quantity: number): number | null {
  const isOverdrawn = quantity > position.quantity + DUST
  const average = averageCost(position)
  const costUsd = isOverdrawn || average === null ? null : average * quantity
  position.quantity -= quantity
  if (isOverdrawn) position.realizedUsd = null
  if (position.quantity <= DUST) {
    position.quantity = 0
    position.costUsd = 0
  } else position.costUsd = costUsd === null ? null : position.costUsd! - costUsd
  return costUsd
}

/** Fix the gain or loss of a movement out of the Safe into the token's P&L. */
function realize(position: Position, proceedsUsd: number | null, costUsd: number | null) {
  const pnlUsd = proceedsUsd === null || costUsd === null ? null : proceedsUsd - costUsd
  position.realizedUsd = total([position.realizedUsd, pnlUsd])
  return pnlUsd
}

function summarize(positions: SafeTokenPosition[], swaps: SafeSwapExchange[]): SafeCostBasis {
  const swappedUsd = knownTotal(swaps.map(({ valueUsd }) => valueUsd))
  const pnlUsd = knownTotal(positions.map(({ pnlUsd }) => pnlUsd))
  const fees = swaps.flatMap(({ fee }) => (fee ? [fee.usd] : []))
  return {
    count: swaps.length,
    pnlUsd,
    pnlRatio: swappedUsd > 0 ? pnlUsd / swappedUsd : null,
    feesUsd: fees.length ? knownTotal(fees) : null,
    unvaluedTokens: positions
      .filter(({ pnlUsd }) => pnlUsd === null)
      .map(({ symbol }) => symbol)
      .sort(),
    positions: [...positions].sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0)),
    swaps
  }
}
