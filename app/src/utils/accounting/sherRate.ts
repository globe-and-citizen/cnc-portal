/**
 * SHER price-of-record, historised over the router compensation multiplier.
 *
 * The router mints `multiplier` SHER per one USD-pegged token deposited, so one
 * SHER costs `1 / multiplier` USD on any given date. The multiplier can change
 * over time, so we replay the `MultiplierUpdated` events to know its value on each
 * entry's date — every SHER leg is therefore **frozen at the multiplier of its own
 * date** (a past entry never re-values when the multiplier moves later). An
 * issuance is then settled at the frozen value of the accruals it matches (see
 * `mappers/sherIssuance.ts`), so `Shares to be issued` nets to zero and a
 * multiplier change never creates a P&L gain or loss.
 *
 * With no change events the multiplier never moved on-chain, so a single point
 * covers every date; we resolve it from the router's live `multiplier` read, then
 * a deposit-implied value, then the 1x default (1 SHER = $1).
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
