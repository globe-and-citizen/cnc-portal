import type { SafeIncomingTransfer } from '@/types/safe'
import {
  averageCost,
  enterPosition,
  exitAtAverageCost,
  isRoundingDust,
  realizeExit,
  sumOrNull,
  type AverageCostPosition
} from './averageCost'
import {
  groupSafeTransfers,
  safeDayOf,
  safeTransactionLegs,
  splitAccruedInterest,
  type SafeAssetAmount,
  type SafeTransactionLeg
} from './swapTransfers'

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
  /**
   * This swap's share of the Safe P&L: the P&L to date of the tokens it touched just after the
   * swap, less just before it, fee excluded; null when one of them cannot be valued. The shares of
   * all swaps add up to the Safe P&L unless a deposit or payment moved a swapped token at a price
   * other than its average cost.
   */
  pnlContributionUsd: number | null
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
  /** The movements the transaction exchanged, accrued interest excluded. */
  rows: SafeIncomingTransfer[]
  legs: SafeTransactionLeg[]
  /** Interest its tokens accrued, received before anything is exchanged. */
  interestLegs: SafeTransactionLeg[]
}

interface Position extends AverageCostPosition {
  asset: string
  symbol: string
  history: SafeCostBasisEvent[]
}

const knownTotal = (values: readonly (number | null)[]) =>
  sumOrNull(values.filter((value) => value !== null))!

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
  const transferTracked = (transaction: Transaction, legs: readonly SafeTransactionLeg[]) => {
    for (const leg of legs) if (tracked.has(leg.asset)) ledger.transfer(transaction, leg)
  }
  for (const transaction of transactions) {
    transferTracked(transaction, transaction.interestLegs)
    if (sources.swapHashes.has(transaction.txHash)) swaps.push(ledger.swap(transaction))
    else transferTracked(transaction, transaction.legs)
  }
  return summarize(ledger.positions(), swaps)
}

/** Oldest first; the service lists the newest first, so reversing keeps on-chain order in a block. */
function chronologicalTransactions(
  movements: readonly SafeIncomingTransfer[],
  safeAddress: string
): Transaction[] {
  return [...groupSafeTransfers([...movements].reverse())]
    .sort(([, a], [, b]) => a[0]!.blockNumber - b[0]!.blockNumber)
    .map(([txHash, rows]) => {
      const { interest, exchanged } = splitAccruedInterest(rows, safeAddress)
      return {
        txHash,
        executionDate: rows[0]!.executionDate,
        rows: exchanged,
        legs: safeTransactionLegs(exchanged, safeAddress),
        interestLegs: safeTransactionLegs(interest, safeAddress)
      }
    })
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
    const weightTotal = sumOrNull(weights)
    return weights.map((weight) =>
      value === null || weightTotal === null || !weightTotal
        ? null
        : (value * weight!) / weightTotal
    )
  }
  const record = (position: Position, event: Omit<SafeCostBasisEvent, 'quantityHeld'>) =>
    position.history.push({ ...event, quantityHeld: position.quantity })

  const priceToday = ({ asset, quantity }: Position) =>
    quantity <= 0 ? null : isStable(asset) ? 1 : (prices.now(asset) ?? null)
  const valueToday = (position: Position) => {
    const price = priceToday(position)
    if (price === null) return position.quantity > 0 ? null : 0
    return price * position.quantity
  }
  /** The token's P&L so far: exits fixed at their day's price, plus what remains at today's. */
  const pnlToDate = (position: Position) =>
    sumOrNull([
      position.realizedUsd,
      valueToday(position),
      position.costUsd === null ? null : -position.costUsd
    ])
  const totalPnlToDate = (tokenPositions: readonly Position[]) =>
    sumOrNull(tokenPositions.map(pnlToDate))

  /** Value an exchange from its stablecoin side, else from the side given, fee already excluded. */
  const exchangeValue = (given: SafeAssetAmount[], received: SafeAssetAmount[], day: string) => {
    const isStableSide = (side: SafeAssetAmount[]) =>
      side.length > 0 && side.every(({ asset }) => isStable(asset))
    if (isStableSide(received)) return knownTotal(received.map(({ quantity }) => quantity))
    if (isStableSide(given)) return knownTotal(given.map(({ quantity }) => quantity))
    return sumOrNull(given.map((amount) => dayValue(amount, day)))
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
    const reportedFee = feeOf(rows)
    const given = legs
      .filter(({ isReceived }) => !isReceived)
      .map((leg) => exchangedAmount(leg, reportedFee))
      .filter(({ quantity }) => !isRoundingDust(quantity))
    const received = legs.filter(({ isReceived }) => isReceived).map(amountOf)
    const valueUsd = exchangeValue(given, received, day)
    const feePrice = reportedFee ? priceOn(reportedFee, day) : null
    const positionsInSwap = [
      ...new Set([...given, ...received, ...(reportedFee ? [reportedFee] : [])].map(positionOf))
    ]
    const pnlBeforeSwap = totalPnlToDate(positionsInSwap)
    const exchange: SafeSwapExchange = {
      txHash,
      executionDate,
      given,
      received,
      valueUsd,
      fee: reportedFee
        ? {
            ...amountOf(reportedFee),
            usd: feePrice === null ? null : feePrice * reportedFee.quantity
          }
        : null,
      pnlContributionUsd: null
    }
    const event = { txHash, executionDate, kind: 'swap' as const, swap: exchange }
    prorate(valueUsd, given, day).forEach((proceeds, index) => {
      const { quantity } = given[index]!
      const position = positionOf(given[index]!)
      const pnlUsd = realizeExit(position, proceeds, exitAtAverageCost(position, quantity))
      const priceUsd = proceeds === null ? null : proceeds / quantity
      record(position, { ...event, quantity, priceUsd, pnlUsd })
    })
    if (reportedFee) {
      const position = positionOf(reportedFee)
      exitAtAverageCost(position, reportedFee.quantity)
      record(position, {
        ...event,
        kind: 'fee',
        quantity: reportedFee.quantity,
        priceUsd: feePrice,
        pnlUsd: null
      })
    }
    entryCosts(received, valueUsd, day).forEach((costUsd, index) => {
      const { quantity } = received[index]!
      const position = positionOf(received[index]!)
      enterPosition(position, quantity, costUsd)
      const priceUsd = costUsd === null ? null : costUsd / quantity
      record(position, { ...event, quantity, priceUsd, pnlUsd: null })
    })
    const pnlAfterSwap = totalPnlToDate(positionsInSwap)
    exchange.pnlContributionUsd =
      pnlBeforeSwap === null || pnlAfterSwap === null ? null : pnlAfterSwap - pnlBeforeSwap
    return exchange
  }

  /** A deposit enters at its day's price; a payment leaves at it and fixes its P&L. */
  const transfer = ({ txHash, executionDate }: Transaction, leg: SafeTransactionLeg) => {
    const position = positionOf(leg)
    const priceUsd = priceOn(leg, safeDayOf(executionDate))
    const valueUsd = priceUsd === null ? null : priceUsd * leg.quantity
    const event = { txHash, executionDate, swap: null, quantity: leg.quantity, priceUsd }
    if (leg.isReceived) {
      enterPosition(position, leg.quantity, valueUsd)
      record(position, { ...event, kind: 'received', pnlUsd: null })
    } else {
      const pnlUsd = realizeExit(position, valueUsd, exitAtAverageCost(position, leg.quantity))
      record(position, { ...event, kind: 'sent', pnlUsd })
    }
  }

  const close = (position: Position): SafeTokenPosition => {
    const { asset, symbol, quantity, costUsd, history } = position
    return {
      asset,
      symbol,
      quantity,
      costUsd,
      averageCostUsd: averageCost(position),
      priceUsd: priceToday(position),
      valueUsd: quantity > 0 ? valueToday(position) : null,
      pnlUsd: pnlToDate(position),
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
