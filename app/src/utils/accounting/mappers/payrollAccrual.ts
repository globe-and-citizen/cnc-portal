/**
 * Payroll accrual mapper — the wage is *earned* over the **weekly claim**, so the
 * accrual is booked once per week, not per individual daily claim (spec §4,
 * UC-CASH-02), before any on-chain withdrawal.
 *
 * For each rate in the member's wage it books one balanced posting:
 *
 *     Dr Payroll Expense
 *        Cr Wage Payable          (cash rates: native / USDC)
 *        Cr Shares to be issued   (the SHER rate)
 *
 * The accrual lands only once the week has **ended**: while a week is still in
 * progress the member may keep submitting daily claims, so booking mid-week would
 * churn the general ledger and restate the same week on every submit. Waiting for
 * the week to close means one stable posting per week (fewer entries).
 *
 * Signing the claim adds **no** entry; the later on-chain `Withdraw` /
 * `WithdrawToken` (UC-CASH-03) settles these liabilities. A `disabled` claim is
 * never accrued. Amounts come from the wage rate × hours worked (so payroll cost
 * is recognised at the declared rate, independent of the settlement token).
 */
import { parseUnits } from 'viem'
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/constantUtil'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

/** A weekly claim spans the seven days from its `weekStart` (UTC ISO Monday). */
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** A submitted claim accrues; a `disabled` (cancelled) one does not. */
function isAccruable(status: WeeklyClaim['status']): boolean {
  return status !== 'disabled'
}

/**
 * Has the claim's week finished as of `now`? Only ended weeks accrue, so the
 * in-progress week stays out of the general ledger until it closes. An unparseable
 * `weekStart` can't be judged in progress, so we let it through rather than hide it.
 */
function isWeekEnded(claim: WeeklyClaim, now: number): boolean {
  const start = new Date(claim.weekStart).getTime()
  if (!Number.isFinite(start)) return true
  return now >= start + WEEK_MS
}

/** Unix seconds for the accrual — the submission time, falling back to weekStart. */
function accrualSeconds(claim: WeeklyClaim): number {
  const ms = new Date(claim.createdAt || claim.weekStart).getTime()
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : 0
}

/** Base units of `hours × ratePerHour` for a token, for USD valuation. */
function accruedBaseUnits(minutesWorked: number, ratePerHour: number, decimals: number): bigint {
  const whole = (minutesWorked * ratePerHour) / 60
  if (whole <= 0) return 0n
  return parseUnits(whole.toFixed(decimals), decimals)
}

/**
 * Map every submitted weekly claim whose week has **ended** to its UC-CASH-02
 * accrual postings. Claims for the week still in progress (relative to `now`) are
 * skipped so the ledger isn't restated on every mid-week submit.
 */
export function mapPayrollAccruals(
  weeklyClaims: readonly WeeklyClaim[] | undefined,
  ctx: MapperContext,
  now: number = Date.now()
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  for (const claim of weeklyClaims ?? []) {
    if (!isAccruable(claim.status)) continue
    if (!isWeekEnded(claim, now)) continue
    const at = accrualSeconds(claim)
    for (const rate of claim.wage?.ratePerHour ?? []) {
      const tokenId = rate.type as TokenId
      const base = accruedBaseUnits(claim.minutesWorked, rate.amount, getTokenDecimals(tokenId))
      if (base === 0n) continue
      const isShare = tokenId === 'sher'
      entries.push(
        makeEntry({
          id: `accrual-${claim.id}-${tokenId}`,
          timestamp: at,
          useCase: 'UC-CASH-02',
          debit: 'Payroll Expense',
          credit: isShare ? 'Shares to be issued' : 'Wage Payable',
          amountUsd: ctx.toUsd(base, tokenId, atDate(at)),
          token: tokenId,
          rawAmount: base.toString(),
          counterparty: claim.memberAddress,
          category: 'Payroll',
          enrichment: 'enriched',
          memo: 'Wage earned — weekly claim submitted'
        })
      )
    }
  }
  return entries
}
