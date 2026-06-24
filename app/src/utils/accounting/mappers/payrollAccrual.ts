/**
 * Payroll accrual mapper — the wage is *earned* when the member **submits** the
 * weekly claim (spec §4, UC-CASH-02), before any on-chain withdrawal.
 *
 * For each rate in the member's wage it books one balanced posting:
 *
 *     Dr Payroll Expense
 *        Cr Wage Payable          (cash rates: native / USDC)
 *        Cr Shares to be issued   (the SHER rate)
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

/** A submitted claim accrues; a `disabled` (cancelled) one does not. */
function isAccruable(status: WeeklyClaim['status']): boolean {
  return status !== 'disabled'
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

/** Map every submitted weekly claim to its UC-CASH-02 accrual postings. */
export function mapPayrollAccruals(
  weeklyClaims: readonly WeeklyClaim[] | undefined,
  ctx: MapperContext
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  for (const claim of weeklyClaims ?? []) {
    if (!isAccruable(claim.status)) continue
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
