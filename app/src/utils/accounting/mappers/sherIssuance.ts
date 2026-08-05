/**
 * SHER realization settlement — freeze what has been withdrawn, float what is still
 * pending.
 *
 * The SHER lifecycle is two postings:
 *
 *   accrual   (UC-CASH-02)              Cr Shares to be issued   · shares *earned*
 *   issuance  (UC-CASH-03 / DEFAULT-D)  Dr Shares to be issued · Cr Investor Equity
 *                                       · shares *taken* (withdrawal or direct mint)
 *
 * Every leg is first stamped at the multiplier of its **own date** (see `sherRate.ts`),
 * so an **issuance is already frozen at its withdraw/mint-date value** — the realization
 * price, which must never move again. This pass only re-values the **accrual** legs so
 * `Shares to be issued` behaves correctly:
 *
 * - the accrual quantity **matched** by an issuance (FIFO per member, by SHER quantity)
 *   is re-valued to that issuance's date rate — equal to the issuance leg, so the two
 *   cancel `Shares to be issued` to zero and Investor Equity keeps the realization value;
 * - the accrual quantity **still pending** (never withdrawn) is re-valued to the
 *   **current** multiplier, so open `Shares to be issued` floats at today's rate until
 *   it is taken.
 *
 * A direct mint (DEFAULT-D) only settles accruals dated **before** it (shares granted
 * early must not absorb later wages); a withdrawal (UC-CASH-03) is unrestricted, since
 * its accrual is dated at week end and can post after an early payout. Any issued
 * quantity with no accrual behind it keeps its own-date value (cash-for-shares on the
 * day). An accrual that is partly withdrawn carries a quantity-weighted value: the
 * withdrawn part frozen, the rest current.
 */
import { formatUnits } from 'viem'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { round6 } from '@/utils/accounting/toUsd'
import { getTokenDecimals } from '@/utils/constantUtil'

const SHARES_TO_BE_ISSUED = 'Shares to be issued'
const INVESTOR_EQUITY = 'Investor Equity'
const SHER_DECIMALS = getTokenDecimals('sher')

/** An accrual being consumed FIFO: the value frozen so far + the quantity still open. */
interface AccrualState {
  entry: LedgerEntry
  totalQty: number
  matchedQty: number
  /** Σ (withdrawn quantity × the withdrawal's own-date rate) — the frozen value. */
  frozenValue: number
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

function memberKey(entry: LedgerEntry): string {
  return (entry.counterparty ?? '').toLowerCase()
}

/** FIFO queues of open accrual states, keyed by member (lowercased counterparty). */
function buildAccrualQueues(entries: readonly LedgerEntry[]): {
  states: Map<string, AccrualState>
  queues: Map<string, AccrualState[]>
} {
  const states = new Map<string, AccrualState>()
  const queues = new Map<string, AccrualState[]>()
  const accruals = entries.filter(isSherAccrual).sort((a, b) => a.timestamp - b.timestamp)
  for (const accrual of accruals) {
    const qty = sherQty(accrual)
    if (qty <= 0) continue
    const state: AccrualState = { entry: accrual, totalQty: qty, matchedQty: 0, frozenValue: 0 }
    states.set(accrual.id, state)
    const queue = queues.get(memberKey(accrual)) ?? []
    queue.push(state)
    queues.set(memberKey(accrual), queue)
  }
  return { states, queues }
}

/**
 * Consume the member's open accruals for one issuance, FIFO by SHER quantity, freezing
 * the matched accrual value at the issuance's own-date rate (`issuance.rate`).
 */
function consumeAccruals(issuance: LedgerEntry, queue: AccrualState[] | undefined): void {
  let remaining = sherQty(issuance)
  if (remaining <= 0 || !queue) return

  // The issuance leg is already stamped at its withdraw/mint-date rate — reuse it so
  // the matched accrual cancels the issuance exactly in `Shares to be issued`.
  const withdrawRate = issuance.rate ?? 0
  // A direct mint only settles work accrued before it; a withdrawal is unrestricted.
  const cutoff = issuance.useCase === 'DEFAULT-D' ? issuance.timestamp : Infinity

  let head: AccrualState | undefined
  while (remaining > 0 && (head = queue[0]) && head.entry.timestamp <= cutoff) {
    const open = head.totalQty - head.matchedQty
    const take = Math.min(open, remaining)
    head.matchedQty += take
    head.frozenValue += take * withdrawRate
    remaining -= take
    if (head.totalQty - head.matchedQty <= 0) queue.shift()
  }
}

/**
 * Re-value every SHER accrual: the withdrawn part frozen at its realization rate, the
 * still-pending part at the current rate. Pure: returns a new array in the same order;
 * only matched/pending accrual legs change (`amountUsd` and the displayed `rate`).
 * Issuance legs are left at their own-date (frozen) value.
 */
export function settleWithdrawnSher(
  entries: readonly LedgerEntry[],
  currentSherRate: number
): LedgerEntry[] {
  const { states, queues } = buildAccrualQueues(entries)

  // Issuances consume the accrual queues in chronological order (FIFO).
  const issuances = entries.filter(isSherIssuance).sort((a, b) => a.timestamp - b.timestamp)
  for (const issuance of issuances) {
    consumeAccruals(issuance, queues.get(memberKey(issuance)))
  }

  return entries.map((entry) => {
    const state = states.get(entry.id)
    if (!state || !isSherAccrual(entry)) return entry
    const pendingQty = state.totalQty - state.matchedQty
    const amountUsd = round6(state.frozenValue + pendingQty * currentSherRate)
    return { ...entry, amountUsd, rate: round6(amountUsd / state.totalQty) }
  })
}
