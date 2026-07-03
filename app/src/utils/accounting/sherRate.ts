/**
 * SHER price-of-record, derived from the SafeDepositRouter compensation
 * multiplier (spec §1 "Currency": *SHER valued at the agreed mint price*).
 *
 * The router mints `multiplier` SHER per **one** USD-pegged token deposited
 * (`sherWhole = tokenWhole × multiplier`, see `SafeDepositRouter.calculateCompensation`).
 * So the cost basis of one SHER is the inverse of the multiplier in effect on
 * that date:
 *
 *     1 SHER  ≈  1 / multiplier   USD
 *
 * This is the same per-share valuation a capital raise books (UC-SDR-01 credits
 * Investor Equity by the deposited USD, which equals `sherWhole × 1/multiplier`),
 * so wage-in-SHER (UC-CASH-02 accrual / UC-CASH-03 settlement) increases Investor
 * Equity by a consistent, non-zero amount instead of the Phase-1 $0.
 *
 * The multiplier is set on the "Set Multiplier" action and **can change over
 * time**, so the value is historised: we replay the `MultiplierUpdated` events to
 * know the multiplier on any given date. When it was never changed on-chain we
 * fall back, in order, to the router's **live multiplier read straight from the
 * contract** (the constructor sets an initial multiplier without emitting an
 * event), then the multiplier implied by a deposit, then the contract's 1x
 * default — so SHER is valued at 1 SHER = $1 (1 USDC mints 1 SHER) rather than $0.
 */
import { formatUnits } from 'viem'
import type { SafeMultiplierUpdatedRow, SafeDepositRow } from '@/types/ponder/investor'
import { resolveTokenIdByAddress, getTokenDecimals } from '@/utils/constantUtil'
import { isUsdPegged } from '@/utils/accounting/toUsd'

/** The router multiplier (in SHER decimals) and SHER both use 6 decimals. */
const MULTIPLIER_DECIMALS = 6
const SHER_DECIMALS = 6

/**
 * The router's default (and minimum) multiplier is 1x: 1 USDC mints 1 SHER, so
 * 1 SHER = $1. Used when nothing else pins down the multiplier, so wage-in-SHER
 * is valued at the contract default instead of the Phase-1 $0.
 */
const DEFAULT_MULTIPLIER = 1

/** Whole-units value of a base-unit amount, tolerating malformed input. */
function toWhole(value: string | bigint, decimals: number): number {
  try {
    return Number(formatUnits(BigInt(value), decimals))
  } catch {
    return 0
  }
}

/** The whole-units SHER-per-token multiplier in effect from `timestamp` onward. */
export interface SherMultiplierPoint {
  timestamp: number
  multiplier: number
}

/**
 * Multiplier (whole SHER-per-token) implied by the most recent USD-pegged
 * deposit — the fallback when the multiplier was never changed on-chain. Only
 * USD-pegged deposit tokens are used so the inferred value is a clean USD basis.
 */
function inferMultiplierFromDeposits(deposits: readonly SafeDepositRow[] | undefined): number {
  const recentFirst = [...(deposits ?? [])].sort((a, b) => b.timestamp - a.timestamp)
  for (const deposit of recentFirst) {
    const tokenId = resolveTokenIdByAddress(deposit.token)
    if (!tokenId || !isUsdPegged(tokenId)) continue
    const tokenWhole = toWhole(deposit.tokenAmount, getTokenDecimals(tokenId))
    const sherWhole = toWhole(deposit.sherAmount, SHER_DECIMALS)
    if (tokenWhole > 0 && sherWhole > 0) return sherWhole / tokenWhole
  }
  return 0
}

/**
 * Reconstruct the multiplier timeline from the router's `MultiplierUpdated`
 * events (chronological). The first point uses the event's `oldMultiplier` so
 * dates before the first change are valued at the pre-change multiplier.
 *
 * With no change events the multiplier never moved on-chain, so a single point
 * covers every date. We resolve that point, in order, from: the router's live
 * `multiplier` read straight from the contract (`currentMultiplier`, in whole
 * units — covers the constructor's initial value, which emits no event), then a
 * USD-pegged deposit, then the 1x {@link DEFAULT_MULTIPLIER}. The timeline is
 * therefore never empty, so SHER always carries a non-zero USD value.
 */
export function buildSherMultiplierTimeline(
  updates: readonly SafeMultiplierUpdatedRow[] | undefined,
  deposits: readonly SafeDepositRow[] | undefined,
  currentMultiplier?: number | null
): SherMultiplierPoint[] {
  const events = [...(updates ?? [])].sort((a, b) => a.timestamp - b.timestamp)
  const [first] = events
  if (first) {
    const points: SherMultiplierPoint[] = [
      { timestamp: 0, multiplier: toWhole(first.oldMultiplier, MULTIPLIER_DECIMALS) }
    ]
    for (const event of events) {
      points.push({
        timestamp: event.timestamp,
        multiplier: toWhole(event.newMultiplier, MULTIPLIER_DECIMALS)
      })
    }
    return points
  }
  const live = currentMultiplier && currentMultiplier > 0 ? currentMultiplier : 0
  const fallback = live || inferMultiplierFromDeposits(deposits) || DEFAULT_MULTIPLIER
  return [{ timestamp: 0, multiplier: fallback }]
}

/**
 * A SHER USD rate-of-record over the multiplier timeline: `1 / multiplier` at the
 * multiplier in effect on the entry's date. Returns `null` only for a truly empty
 * timeline (defensive) — {@link buildSherMultiplierTimeline} always yields at
 * least the 1x default, so in practice SHER resolves to a non-zero rate.
 */
export function makeSherUsdRate(
  timeline: readonly SherMultiplierPoint[]
): ((at: Date) => number) | null {
  const points = [...timeline].sort((a, b) => a.timestamp - b.timestamp)
  const [earliest] = points
  if (!earliest) return null
  return (at: Date): number => {
    const seconds = Math.floor(at.getTime() / 1000)
    let multiplier = earliest.multiplier
    for (const point of points) {
      if (point.timestamp <= seconds) multiplier = point.multiplier
      else break
    }
    return multiplier > 0 ? 1 / multiplier : 0
  }
}
