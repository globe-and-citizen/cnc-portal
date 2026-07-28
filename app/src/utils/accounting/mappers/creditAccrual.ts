/**
 * Straight-line interest accrual for a Community Credit round.
 *
 * `FixedReturn.sol` charges a **flat** rate over the whole term
 * (`totalObligation = totalFunded + totalFunded × interestRateBps / 10_000`) and
 * moves no money until the issuer repays. Booking the whole fixed return on the
 * repayment date would dump the entire cost of a multi-month loan into one
 * period, so the expense is instead recognised **as the term runs**: at every
 * month end between the day the round funds and the day it matures, the ledger
 * books the slice earned so far against `Interest Payable`.
 *
 * This module only computes *when* to accrue and *how much has been earned by
 * then*. It is deliberately pure — no ledger types, no context — so the schedule
 * can be unit-tested on its own; {@link ./fixedReturn} turns the schedule into
 * postings and reconciles it against what has actually been paid.
 */

/** A funded round's economics, read from `getLendingOffer` — neither the rate nor
 *  the maturity date travels on the `LendingOfferCreated` event. */
export interface CreditOfferTerms {
  /** Offer id, as the event feed spells it (decimal string). */
  offerId: string
  /** Flat rate over the whole term, in basis points (800 = 8%). */
  interestRateBps: number
  /** When the loan comes due, Unix seconds. */
  maturityDate: number
}

/** One accrual point: book enough interest to reach `accrued` by `timestamp`. */
export interface AccrualPoint {
  /** Unix seconds — a month end, or the cutoff itself. */
  timestamp: number
  /** Interest earned **cumulatively** by then, in the token's base units. */
  accrued: bigint
}

/**
 * Guard against a pathological schedule (a maturity date far in the future paired
 * with a clock skew). 600 month ends is 50 years of accrual — well past anything
 * the round wizard can produce, and the walk stops at `asOf` anyway.
 */
const MAX_POINTS = 600

/**
 * The month ends strictly after `start` and at or before `cutoff`, in UTC. The
 * boundary is the last whole second of each month, so a posting dated on it falls
 * inside the month it closes.
 */
function monthEnds(start: number, cutoff: number): number[] {
  const from = new Date(start * 1000)
  const year = from.getUTCFullYear()
  const month = from.getUTCMonth()
  const ends: number[] = []
  for (let i = 1; ends.length < MAX_POINTS; i++) {
    // Date.UTC normalises a month index past 11 into the following year.
    const end = Math.floor(Date.UTC(year, month + i, 1) / 1000) - 1
    if (end > cutoff) break
    if (end > start) ends.push(end)
  }
  return ends
}

/** `total × elapsed / term`, in base units — floored, so accrual never runs ahead. */
function earnedBy(total: bigint, start: number, end: number, at: number): bigint {
  const term = BigInt(end - start)
  if (term <= 0n) return total
  const elapsed = BigInt(Math.min(Math.max(at - start, 0), end - start))
  return (total * elapsed) / term
}

/**
 * The accrual schedule of one funded round: a point per month end between funding
 * and the earlier of maturity and `asOf`, plus a final point at that cutoff so the
 * books are current between two month ends. Empty when there is nothing to spread —
 * no principal, no rate, no terms, or a maturity that does not follow the funding.
 *
 * @param principal  what the round actually raised, in the token's base units
 * @param fundedAt   when the principal was swept to Bank — the loan starts running
 * @param asOf       "now"; the walk never accrues into the future
 */
export function accrualSchedule(
  principal: bigint,
  fundedAt: number,
  terms: CreditOfferTerms | undefined,
  asOf: Date
): AccrualPoint[] {
  if (!terms || principal <= 0n || terms.interestRateBps <= 0) return []
  const maturity = terms.maturityDate
  if (!Number.isFinite(maturity) || maturity <= fundedAt) return []

  const cutoff = Math.min(Math.floor(asOf.getTime() / 1000), maturity)
  if (cutoff <= fundedAt) return []

  const total = (principal * BigInt(Math.round(terms.interestRateBps))) / 10_000n
  if (total <= 0n) return []

  const stops = monthEnds(fundedAt, cutoff)
  // Close on the cutoff itself, unless a month end already lands exactly there.
  if (stops[stops.length - 1] !== cutoff) stops.push(cutoff)

  return stops.map((timestamp) => ({
    timestamp,
    accrued: earnedBy(total, fundedAt, maturity, timestamp)
  }))
}
