import type { PolymarketActivity } from '~/types/polymarket'
import type { LedgerCategory, LedgerEntry } from '~/utils/accounting'

/**
 * Polymarket trading fees.
 *
 * Polymarket never charges its fee as a separate transfer: it bakes it into
 * the execution price. A buyer pays above the quoted price, a seller receives
 * below it, so the fee of one fill is the gap between its quoted value
 * (shares × price) and the USDC that actually settled. Splits, merges and
 * redeems settle at par and carry no fee.
 *
 * Every statement derives its fees from these helpers so the Summary, the
 * Income Statement, the Balance Sheet and the General Ledger agree.
 */

interface Fill {
  quantity?: number
  unitPrice?: number
  /** USDC that actually settled for the fill. */
  amount: number
}

/** A fee below this is rounding dust, not a charged fee. */
const CHARGED_FEE_THRESHOLD = 1e-4

const TRADE_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>(['TRADE_BUY', 'TRADE_SELL'])

function fillFee({ quantity, unitPrice, amount }: Fill): number {
  if (quantity == null || unitPrice == null) {
    return 0
  }
  return Math.abs(quantity * unitPrice - amount)
}

/** Fee paid on a Polymarket activity row (0 for anything but a trade). */
export function activityFee(activity: PolymarketActivity): number {
  if (activity.type !== 'TRADE') {
    return 0
  }
  return fillFee({ quantity: activity.size, unitPrice: activity.price, amount: activity.usdcSize ?? 0 })
}

/** Fee paid on a ledger entry (0 for anything but a trade). */
export function ledgerEntryFee(entry: LedgerEntry): number {
  return TRADE_CATEGORIES.has(entry.category) ? fillFee(entry) : 0
}

/**
 * Cost of the contracts an acquisition (buy or split) adds to the books,
 * excluding the trading fee, which is booked as an expense instead.
 */
export function contractCost(entry: LedgerEntry): number {
  return entry.amount - ledgerEntryFee(entry)
}

/** True when a fill paid a real fee rather than rounding dust (maker / 0-fee fills excluded). */
export function isChargedFee(fee: number): boolean {
  return fee > CHARGED_FEE_THRESHOLD
}
