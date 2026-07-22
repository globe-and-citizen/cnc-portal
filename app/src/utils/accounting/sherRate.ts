/**
 * SHER price-of-record — a **realization** model: a SHER leg's USD value is frozen
 * at the moment the shares are actually taken, and floats before that.
 *
 * The router mints `multiplier` SHER per one USD-pegged token deposited, so one SHER
 * is worth `1 / multiplier` USD. A wage is a **fixed SHER quantity** (10h × 5 SHER/h =
 * 50 SHER, whatever the multiplier), so the multiplier only drives the **USD valuation**
 * of that fixed quantity.
 *
 * Two valuations are needed, and this file exposes both:
 *
 * - {@link buildSherMultiplierTimeline} + {@link makeSherUsdRate} replay the
 *   `MultiplierUpdated` events into a date-keyed rate, so a **withdrawal / mint is
 *   valued at the multiplier in effect on its own date** and stays frozen there — the
 *   realization price never moves afterwards.
 * - {@link resolveCurrentSherMultiplier} gives the **current** multiplier, used to
 *   value SHER that is **accrued but not yet withdrawn** (still pending in
 *   `Shares to be issued`) — that portion floats at today's rate until it is taken.
 *
 * The matching of withdrawals to accruals (freeze the withdrawn portion, float the
 * pending one) lives in `mappers/sherIssuance.ts` ({@link settleWithdrawnSher}).
 */
import { formatUnits } from 'viem'
import type { SafeMultiplierUpdatedRow, SafeDepositRow } from '@/types/ponder/investor'
import { resolveTokenIdByAddress, getTokenDecimals } from '@/utils/constantUtil'
import { isUsdPegged } from '@/utils/accounting/toUsd'

const MULTIPLIER_DECIMALS = 6
const SHER_DECIMALS = 6
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

/** Multiplier implied by the most recent USD-pegged deposit (sherWhole / tokenWhole). */
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

/** The most recent on-chain multiplier from the `MultiplierUpdated` change events. */
function latestEventMultiplier(updates: readonly SafeMultiplierUpdatedRow[] | undefined): number {
  const events = [...(updates ?? [])].sort((a, b) => a.timestamp - b.timestamp)
  const last = events[events.length - 1]
  return last ? toWhole(last.newMultiplier, MULTIPLIER_DECIMALS) : 0
}

/**
 * Reconstruct the multiplier timeline from the `MultiplierUpdated` events. The
 * first point uses the event's `oldMultiplier` so dates before the first change
 * are valued at the pre-change multiplier. With no events the timeline is a single
 * point resolved from the live read, a deposit, then the 1x default.
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
      {
        timestamp: 0,
        // Defended to the 1x default — a malformed `oldMultiplier` must not value
        // every pre-first-event SHER entry at $0.
        multiplier: toWhole(first.oldMultiplier, MULTIPLIER_DECIMALS) || DEFAULT_MULTIPLIER
      }
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
 * A SHER USD rate-of-record over the timeline: `1 / multiplier` at the multiplier
 * in effect on the entry's date. Returns `null` only for a truly empty timeline
 * (defensive) — {@link buildSherMultiplierTimeline} always yields at least the 1x
 * default.
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

/**
 * The current whole-units SHER-per-token multiplier: the router's live read, else the
 * most recent change event, else a deposit-implied value, else the 1x default. Always
 * returns a positive multiplier so pending SHER never values to $0 for lack of a price.
 */
export function resolveCurrentSherMultiplier(
  updates: readonly SafeMultiplierUpdatedRow[] | undefined,
  deposits: readonly SafeDepositRow[] | undefined,
  currentMultiplier?: number | null
): number {
  const live = currentMultiplier && currentMultiplier > 0 ? currentMultiplier : 0
  return (
    live ||
    latestEventMultiplier(updates) ||
    inferMultiplierFromDeposits(deposits) ||
    DEFAULT_MULTIPLIER
  )
}

/** USD value of one SHER at the current multiplier — the rate pending accruals float at. */
export function currentSherUsdRate(
  updates: readonly SafeMultiplierUpdatedRow[] | undefined,
  deposits: readonly SafeDepositRow[] | undefined,
  currentMultiplier?: number | null
): number {
  const multiplier = resolveCurrentSherMultiplier(updates, deposits, currentMultiplier)
  return multiplier > 0 ? 1 / multiplier : 0
}
