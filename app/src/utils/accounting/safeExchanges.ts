/**
 * Replay Safe carrying values, book evidenced asset exchanges at the price actually paid, and
 * book the Swap P&L of an exchange into a USD stablecoin.
 */
import { assetDecimals, type AssetId } from '@/utils/tokens/assets'
import { makeJournalEntryDraft, type JournalEntryDraft } from './journalEntryDraft'
import {
  isRepresentableUsdRate,
  usdAmountFromToken,
  usdRateFromNumber,
  usdAmountToNumber
} from './monetaryAmount'
import { isUsdPegged, round6, wholeTokenAmount } from './toUsd'

interface Holding {
  quantity: bigint
  amount: bigint
  complete: boolean
}

function marketAmount(entry: JournalEntryDraft): bigint {
  return usdAmountFromToken(
    BigInt(entry.rawAmount),
    entry.token,
    usdRateFromNumber(entry.rate ?? 0),
    entry.asset
  )
}

/**
 * Give an exchange leg its exact carrying amount and, when it fits the ledger's six-decimal
 * rate, the unit price that amount implies.
 */
function setCarryingAmount(entry: JournalEntryDraft, amount: bigint): void {
  entry.carryingAmount = amount
  const units = wholeTokenAmount(BigInt(entry.rawAmount), entry.token, entry.asset)
  if (units <= 0) return
  const rate = round6(usdAmountToNumber(amount) / units)
  if (isRepresentableUsdRate(rate)) entry.rate = rate
}

/** Whether a receipt carries a USD value a later swap can take as its carrying basis. */
function hasEvidencedValue(entry: JournalEntryDraft): boolean {
  if (entry.useCase === 'SAFE-SWAP') return entry.accountingIssue === undefined
  return (entry.rate ?? 0) > 0
}

/** Whether a receipt's precision and trust allow it to carry the price paid. */
function isBookableReceipt(entry: JournalEntryDraft): boolean {
  return assetDecimals(entry.token, entry.asset) !== null && entry.asset?.trusted !== false
}

/** Total of the carrying amounts given up, or null when any of them is unavailable. */
function evidencedTotal(amounts: readonly (bigint | null)[]): bigint | null {
  return amounts.reduce<bigint | null>(
    (sum, amount) => (sum === null || amount === null ? null : sum + amount),
    0n
  )
}

/** Carrying amount of the part of a sold leg that CoW Protocol reports as its fee. */
function feeCarryingAmount(entry: JournalEntryDraft): bigint {
  if (!entry.feeRawAmount || entry.carryingAmount === undefined) return 0n
  return (entry.carryingAmount * BigInt(entry.feeRawAmount)) / BigInt(entry.rawAmount)
}

/** Whether every asset a swap received is a USD stablecoin, which keeps its $1.00 face value. */
function receivesUsdStablecoin(incoming: readonly JournalEntryDraft[]): boolean {
  return incoming.every((entry) => isUsdPegged(entry.token))
}

/**
 * Give the received legs their carrying amount and return the result the swap realizes. A USD
 * stablecoin keeps its face value, so its gap from the price paid is realized; any other asset
 * carries the price paid and realizes nothing.
 */
function bookReceipts(incoming: readonly JournalEntryDraft[], pricePaid: bigint): bigint {
  if (!receivesUsdStablecoin(incoming)) {
    allocatePricePaid(incoming, pricePaid)
    return 0n
  }
  for (const entry of incoming) setCarryingAmount(entry, marketAmount(entry))
  return incoming.reduce((sum, entry) => sum + marketAmount(entry), 0n) - pricePaid
}

/** Split the price paid exactly across the received legs, in proportion to their quantities. */
function allocatePricePaid(incoming: readonly JournalEntryDraft[], pricePaid: bigint): void {
  const quantity = incoming.reduce((sum, entry) => sum + BigInt(entry.rawAmount), 0n)
  let allocated = 0n
  incoming.forEach((entry, index) => {
    const isLastLeg = index === incoming.length - 1
    const share = isLastLeg
      ? pricePaid - allocated
      : (pricePaid * BigInt(entry.rawAmount)) / quantity
    allocated += share
    setCarryingAmount(entry, share)
  })
}

/** Leave every leg of an exchange that cannot be booked at zero, marked as lacking its basis. */
function withholdExchange(exchange: readonly JournalEntryDraft[]): void {
  for (const entry of exchange) {
    entry.accountingIssue ??= 'exchange-basis-unavailable'
    entry.carryingAmount = 0n
  }
}

/** A USD-only line a swap adds to its operation: its fee, Swap P&L or market value adjustment. */
function swapUsdLineDraft(
  primary: JournalEntryDraft,
  line: {
    suffix: string
    debit: JournalEntryDraft['debit']
    credit: JournalEntryDraft['credit']
    amount: bigint
    memo: string
  }
): JournalEntryDraft {
  return makeJournalEntryDraft({
    id: `${primary.id}-${line.suffix}`,
    txHash: primary.txHash,
    sourceOperationId: primary.sourceOperationId,
    timestamp: primary.timestamp,
    useCase: 'SAFE-SWAP',
    debit: line.debit,
    credit: line.credit,
    token: 'usdc',
    rawAmount: '0',
    rate: 1,
    carryingAmount: line.amount,
    memo: line.memo
  })
}

/** The Transaction Fee Expense line of a swap, at the carrying amount of what the fee took. */
function transactionFeeDraft(primary: JournalEntryDraft, amount: bigint): JournalEntryDraft {
  return swapUsdLineDraft(primary, {
    suffix: 'transaction-fee',
    debit: 'Transaction Fee Expense',
    credit: null,
    amount,
    memo: 'Transaction fee CoW Protocol took from the asset given up'
  })
}

/**
 * The Swap P&L line of a swap: the Safe overview's P&L when the data layer attaches it, else
 * the result a received USD stablecoin realizes.
 */
function swapPnlDraft(primary: JournalEntryDraft, pnl: bigint): JournalEntryDraft {
  const isGain = pnl > 0n
  return swapUsdLineDraft(primary, {
    suffix: 'swap-pnl',
    debit: isGain ? null : 'Swap P&L',
    credit: isGain ? 'Swap P&L' : null,
    amount: isGain ? pnl : -pnl,
    memo: 'Assets received at their current value against the swap-day value given up'
  })
}

/**
 * The part of the Swap P&L the Cash — Safe lines do not carry, so they keep the price paid.
 * A gain debits Safe Market Value Adjustment, a loss credits it.
 */
function marketValueAdjustmentDraft(primary: JournalEntryDraft, gap: bigint): JournalEntryDraft {
  const isGain = gap > 0n
  return swapUsdLineDraft(primary, {
    suffix: 'market-value-adjustment',
    debit: isGain ? 'Safe Market Value Adjustment' : null,
    credit: isGain ? null : 'Safe Market Value Adjustment',
    amount: isGain ? gap : -gap,
    memo: 'Swap P&L the Cash — Safe lines do not carry, as they keep the price paid'
  })
}

/**
 * Book one exchange at the price actually paid: what was given up less the reported fee.
 * A received USD stablecoin realizes its gap from that price. When the data layer attaches
 * the Safe overview's P&L (`swapPnl`), the swap's Swap P&L line books that figure and Safe
 * Market Value Adjustment the part the cash lines do not carry, all in the swap's own
 * posting. Returns the drafts the exchange adds; an exchange that cannot be booked is
 * withheld instead.
 */
function bookExchange(
  incoming: readonly JournalEntryDraft[],
  outgoing: readonly JournalEntryDraft[],
  given: bigint | null
): JournalEntryDraft[] {
  if (given === null || !incoming.length || !incoming.every(isBookableReceipt)) {
    withholdExchange([...incoming, ...outgoing])
    return []
  }
  const primary = incoming[0]!
  const fee = outgoing.reduce((sum, entry) => sum + feeCarryingAmount(entry), 0n)
  const overviewPnl = [...incoming, ...outgoing].find(
    (entry) => entry.swapPnl !== undefined
  )?.swapPnl
  const realized = bookReceipts(incoming, given - fee)
  const pnl = overviewPnl ?? realized
  const gap = pnl - realized
  return [
    ...(fee > 0n ? [transactionFeeDraft(primary, fee)] : []),
    ...(pnl !== 0n ? [swapPnlDraft(primary, pnl)] : []),
    ...(gap !== 0n ? [marketValueAdjustmentDraft(primary, gap)] : [])
  ]
}

/**
 * Full-history weighted-average carrying basis, replayed on every source refresh.
 *
 * What a swap gives up leaves at its carrying amount. The fee CoW Protocol reports is booked
 * as Transaction Fee Expense at the carrying amount of the part it took, and the rest is the
 * price actually paid. A received asset carries that price for good; a received USD
 * stablecoin keeps its face value, realizing its gap on Swap P&L. A swap the data layer gives
 * the Safe overview's P&L (`swapPnl`) books that figure on Swap P&L, with the rest against Safe
 * Market Value Adjustment in the same posting, so Cash — Safe never leaves the price paid.
 *
 * Within one operation, non-exchange entries (e.g. a same-operation mint) are applied
 * first as ordinary evidence — never as another swap receipt. A non-exchange depletion
 * that disagrees with its market price cannot establish a weighted acquisition basis for
 * a later swap, so it marks that holding incomplete.
 */
export function prepareSafeExchanges(drafts: readonly JournalEntryDraft[]): JournalEntryDraft[] {
  const holdings = new Map<AssetId, Holding>()
  const operations = new Map<string, JournalEntryDraft[]>()
  for (const entry of [...drafts].sort(
    (a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)
  )) {
    const key = entry.txHash?.toLowerCase() ?? entry.sourceOperationId ?? entry.id
    const group = operations.get(key) ?? []
    group.push({ ...entry })
    operations.set(key, group)
  }
  const result: JournalEntryDraft[] = []
  const add = (entry: JournalEntryDraft) => {
    if (entry.debit !== 'Cash — Safe') return
    const holding = holdings.get(entry.token) ?? { quantity: 0n, amount: 0n, complete: true }
    const amount = entry.carryingAmount ?? marketAmount(entry)
    holding.quantity += BigInt(entry.rawAmount)
    holding.amount += amount
    holding.complete &&=
      BigInt(entry.rawAmount) === 0n ||
      (hasEvidencedValue(entry) && assetDecimals(entry.token, entry.asset) !== null)
    holdings.set(entry.token, holding)
  }
  const remove = (entry: JournalEntryDraft, exchange: boolean): bigint | null => {
    if (entry.credit !== 'Cash — Safe') return null
    const quantity = BigInt(entry.rawAmount)
    const holding = holdings.get(entry.token)
    const evidenced =
      holding && holding.complete && holding.quantity >= quantity && holding.quantity > 0n
    const amount = evidenced ? (holding.amount * quantity) / holding.quantity : null
    if (exchange && amount !== null) setCarryingAmount(entry, amount)
    if (holding) {
      holding.quantity -= quantity
      holding.amount -= exchange && amount !== null ? amount : marketAmount(entry)
      if (!exchange && (amount === null || amount !== marketAmount(entry))) holding.complete = false
      if (holding.quantity < 0n || holding.amount < 0n) holding.complete = false
    }
    return amount
  }
  for (const group of operations.values()) {
    const exchange = group.filter((entry) => entry.useCase === 'SAFE-SWAP')
    const other = group.filter((entry) => entry.useCase !== 'SAFE-SWAP')
    for (const entry of other) {
      add(entry)
      remove(entry, false)
    }
    if (!exchange.length) {
      result.push(...group)
      continue
    }
    const incoming = exchange.filter((entry) => entry.debit === 'Cash — Safe')
    const outgoing = exchange.filter((entry) => entry.credit === 'Cash — Safe')
    const given = evidencedTotal(outgoing.map((entry) => remove(entry, true)))
    group.push(...bookExchange(incoming, outgoing, given))
    for (const entry of incoming) add(entry)
    result.push(...group)
  }
  return result
}
