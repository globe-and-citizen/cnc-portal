/**
 * SHER price-of-record — valued at the router's **current** compensation multiplier.
 *
 * The router mints `multiplier` SHER per one USD-pegged token deposited, so one SHER
 * is worth `1 / multiplier` USD. A wage is defined and minted as a **fixed SHER
 * quantity** (10h × 5 SHER/h = 50 SHER, whatever the multiplier is), so the multiplier
 * never changes how many SHER a member gets — it only drives the **USD valuation** of
 * that fixed quantity.
 *
 * Every SHER leg is valued at the **same current multiplier** — the accrual and the
 * issuance that settles it alike — so 50 SHER always shows the same USD amount wherever
 * it appears, the two legs cancel `Shares to be issued` to zero without any revaluation
 * account, and when the multiplier moves the whole SHER book re-values together. That
 * keeps the equity coherent with the fixed SHER quantity a member actually holds: it is
 * still 50 SHER; only its USD worth follows the current rate.
 *
 * The current multiplier resolves from the router's live `multiplier` read, then the
 * most recent `MultiplierUpdated` event, then a deposit-implied value, then the 1x
 * default (1 SHER = $1).
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
 * The current whole-units SHER-per-token multiplier: the router's live read, else the
 * most recent change event, else a deposit-implied value, else the 1x default. Always
 * returns a positive multiplier so SHER never values to $0 for lack of a price.
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

/**
 * A SHER USD rate-of-record: `1 / multiplier`, applied to **every** date — the current
 * multiplier values all SHER legs alike, so a multiplier change re-values the whole SHER
 * book at once. The returned function ignores its date argument (kept for the
 * `UsdRateOfRecord` shape). Returns `null` only for a non-positive multiplier
 * (defensive) — {@link resolveCurrentSherMultiplier} always yields ≥ 1x.
 */
export function makeSherUsdRate(multiplier: number): ((at: Date) => number) | null {
  if (!(multiplier > 0)) return null
  const rate = 1 / multiplier
  return () => rate
}
