/**
 * SHER issuance settlement — an issuance extinguishes its accruals at their
 * **frozen** value.
 *
 * Each SHER leg starts valued at the multiplier of its own date (see
 * `sherRate.ts`):
 *
 *   accrual   (UC-CASH-02)  Cr Shares to be issued  · value at the submit date
 *   issuance  (UC-CASH-03 / DEFAULT-D)  Dr Shares to be issued · Cr Investor Equity
 *
 * A company never books a gain or loss on movements of its **own equity
 * instruments** — a multiplier change is dilution between shareholders (visible
 * in the SHER quantity), not P&L. So instead of valuing the issuance at its own
 * date and plugging the difference into a revaluation account, this step
 * **re-values the issuance leg at the frozen value of the accruals it settles**:
 * equity is credited with what the member actually contributed (the work, at the
 * value it had when submitted), and `Shares to be issued` nets to zero naturally.
 *
 * Accruals are matched per member and consumed **FIFO by SHER quantity**, so a
 * single withdrawal settling several claims (or part of one) inherits the
 * quantity-weighted frozen value. A direct mint consumes only accruals dated
 * before it (shares granted early must not absorb later wages); a withdrawal is
 * not time-restricted, since its accrual is dated at week end and can post after
 * an early payout. Any issued quantity with no accrual behind it
 * (a direct investor mint) keeps its own-date valuation — that is cash-for-shares
 * on the day it happened, which is correct as is. Unsettled accruals are left
 * alone: they remain a liability at their frozen value.
 */
import { formatUnits } from 'viem'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { round6 } from '@/utils/accounting/toUsd'
import { getTokenDecimals } from '@/utils/constantUtil'

const SHARES_TO_BE_ISSUED = 'Shares to be issued'
const INVESTOR_EQUITY = 'Investor Equity'
const SHER_DECIMALS = getTokenDecimals('sher')

/** An accrual's not-yet-settled share of quantity, at its frozen USD-per-SHER value. */
interface OpenAccrual {
  timestamp: number
  remainingQty: number
  unitValue: number
}

/** Whole-unit SHER quantity of an entry, tolerating malformed input. */
function sherQty(entry: LedgerEntry): number {
  try {
    return Number(formatUnits(BigInt(entry.rawAmount), SHER_DECIMALS))
  } catch {
    return 0
  }
}

/** The SHER equity leg that issues the shares — a wage withdrawal or a direct mint. */
function isSherIssuance(entry: LedgerEntry): boolean {
  return (
    (entry.useCase === 'UC-CASH-03' || entry.useCase === 'DEFAULT-D') &&
    entry.token === 'sher' &&
    entry.debit === SHARES_TO_BE_ISSUED &&
    entry.credit === INVESTOR_EQUITY
  )
}

function isSherAccrual(entry: LedgerEntry): boolean {
  return (
    entry.useCase === 'UC-CASH-02' && entry.token === 'sher' && entry.credit === SHARES_TO_BE_ISSUED
  )
}

/** FIFO queues of open accruals, keyed by member (lowercased counterparty). */
function buildAccrualQueues(entries: readonly LedgerEntry[]): Map<string, OpenAccrual[]> {
  const byMember = new Map<string, OpenAccrual[]>()
  const accruals = entries.filter(isSherAccrual).sort((a, b) => a.timestamp - b.timestamp)
  for (const accrual of accruals) {
    const qty = sherQty(accrual)
    if (qty <= 0) continue
    const key = (accrual.counterparty ?? '').toLowerCase()
    const queue = byMember.get(key) ?? []
    queue.push({
      timestamp: accrual.timestamp,
      remainingQty: qty,
      unitValue: accrual.amountUsd / qty
    })
    byMember.set(key, queue)
  }
  return byMember
}

/**
 * The frozen USD value an issuance settles: its accruals' values consumed FIFO by
 * quantity, plus its own-date value for any unmatched (direct-mint) remainder.
 */
function settledValue(issuance: LedgerEntry, queue: OpenAccrual[] | undefined): number {
  const qty = sherQty(issuance)
  if (qty <= 0) return issuance.amountUsd

  // A direct mint only settles work accrued before it happened — shares granted
  // early must not absorb later wages. A withdrawal (UC-CASH-03) is unrestricted:
  // its accrual is dated at week end, which can fall after an early payout.
  const cutoff = issuance.useCase === 'DEFAULT-D' ? issuance.timestamp : Infinity

  let remaining = qty
  let value = 0
  let head: OpenAccrual | undefined
  while (remaining > 0 && (head = queue?.[0]) && head.timestamp <= cutoff) {
    const take = Math.min(head.remainingQty, remaining)
    value += take * head.unitValue
    remaining -= take
    head.remainingQty -= take
    if (head.remainingQty <= 0) queue.shift()
  }
  // No accrual behind this quantity — keep its own-date valuation (direct mint).
  value += remaining * (issuance.amountUsd / qty)
  return value
}

/**
 * Re-value every SHER issuance at the frozen value of the accruals it settles.
 * Pure: returns a new array in the same order; only matched issuance legs change
 * (`amountUsd` and the displayed `rate` follow the frozen accrual values).
 */
export function settleSherIssuances(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const queues = buildAccrualQueues(entries)
  const settledAmounts = new Map<string, number>()

  // Issuances consume the accrual queues in chronological order (FIFO).
  const issuances = entries.filter(isSherIssuance).sort((a, b) => a.timestamp - b.timestamp)
  for (const issuance of issuances) {
    const queue = queues.get((issuance.counterparty ?? '').toLowerCase())
    settledAmounts.set(issuance.id, round6(settledValue(issuance, queue)))
  }

  return entries.map((entry) => {
    const amountUsd = settledAmounts.get(entry.id)
    if (amountUsd === undefined || !isSherIssuance(entry)) return entry
    const qty = sherQty(entry)
    return { ...entry, amountUsd, ...(qty > 0 ? { rate: round6(amountUsd / qty) } : {}) }
  })
}
