/**
 * SHER price-of-record: every SHER leg is valued at the **current** router
 * compensation multiplier — 1 SHER = 1 / multiplier USD — whatever the entry's
 * date. Valuing all SHER at one rate keeps a wage accrual and its later share
 * issuance in step, so `Shares to be issued` nets to zero once the shares are
 * issued (no historised gap between submit and issuance).
 *
 * The current multiplier is resolved, in order, from: the router's live
 * `multiplier` read (covers the constructor's initial value, which emits no
 * event), then the most recent `MultiplierUpdated` event, then the multiplier
 * implied by a USD-pegged deposit, then the 1x default (1 SHER = $1).
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

/**
 * The current whole-units SHER-per-token multiplier: live contract read, else the
 * most recent change event, else a deposit-implied value, else the 1x default.
 */
export function resolveCurrentSherMultiplier(
  updates: readonly SafeMultiplierUpdatedRow[] | undefined,
  deposits: readonly SafeDepositRow[] | undefined,
  currentMultiplier?: number | null
): number {
  if (currentMultiplier && currentMultiplier > 0) return currentMultiplier
  const events = [...(updates ?? [])].sort((a, b) => a.timestamp - b.timestamp)
  const last = events[events.length - 1]
  if (last) {
    const m = toWhole(last.newMultiplier, MULTIPLIER_DECIMALS)
    if (m > 0) return m
  }
  return inferMultiplierFromDeposits(deposits) || DEFAULT_MULTIPLIER
}

/** USD value of one SHER (1 / current multiplier); 0 only for a non-positive multiplier. */
export function currentSherUsdRate(
  updates: readonly SafeMultiplierUpdatedRow[] | undefined,
  deposits: readonly SafeDepositRow[] | undefined,
  currentMultiplier?: number | null
): number {
  const multiplier = resolveCurrentSherMultiplier(updates, deposits, currentMultiplier)
  return multiplier > 0 ? 1 / multiplier : 0
}
