/**
 * Payroll accrual mapper — the wage is *earned* over the **weekly claim**, so the
 * accrual is booked once per week, not per individual daily claim (spec §4,
 * UC-CASH-02), before any on-chain withdrawal.
 *
 * For each rate in the member's wage it books one balanced posting:
 *
 *     Dr Payroll Expense            Cr Wage Payable          (cash rates: native / USDC)
 *     Dr Share-based Compensation   Cr Shares to be issued   (the SHER rate)
 *
 * The SHER leg is a **non-cash** cost (shares, not treasury), so it is booked to
 * its own `Share-based Compensation` expense account rather than mixed into the
 * cash `Payroll Expense` line.
 *
 * The accrual lands only once the week has **ended**: while a week is still in
 * progress the member may keep submitting daily claims, so booking mid-week would
 * churn the general ledger and restate the same week on every submit. Waiting for
 * the week to close means one stable posting per week (fewer entries).
 *
 * Signing the claim adds **no** entry; the later on-chain `Withdraw` /
 * `WithdrawToken` (UC-CASH-03) settles these liabilities. A `disabled` claim is
 * never accrued. Amounts come from the **same canonical wage calculation the
 * claim is signed and paid with** ({@link buildClaimRatesWithOvertime} — regular
 * minutes at the base rate, overtime minutes at the overtime rate), so the cost
 * recognised here matches the on-chain payout and is independent of the
 * settlement token.
 */
import type { WeeklyClaim } from '@/types/cash-remuneration'
import type { TokenId } from '@/constant'
import { buildClaimRatesWithOvertime } from '@/utils/wageUtil'
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
    if (!claim.wage) continue
    const at = accrualSeconds(claim)
    // Reuse the canonical wage calc (the one the claim is signed/paid with) so the
    // accrued cost matches the on-chain payout, overtime included.
    const rates = buildClaimRatesWithOvertime({
      totalMinutesWorked: claim.minutesWorked,
      maximumHoursPerWeek: claim.wage.maximumHoursPerWeek,
      ratePerHour: claim.wage.ratePerHour ?? [],
      overtimeRatePerHour: claim.wage.overtimeRatePerHour
    })
    for (const rate of rates) {
      const tokenId = rate.type as TokenId
      const base = rate.totalAmount
      if (base <= 0n) continue
      const isShare = tokenId === 'sher'
      entries.push(
        makeEntry({
          id: `accrual-${claim.id}-${tokenId}`,
          timestamp: at,
          useCase: 'UC-CASH-02',
          debit: isShare ? 'Share-based Compensation' : 'Payroll Expense',
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
