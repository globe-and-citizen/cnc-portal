/**
 * SHER realization settlement — freeze what has been withdrawn, float what is still
 * pending.
 *
 * The SHER lifecycle is two postings, in two independent **lanes** — wages and
 * share vesting — that both flow through `SHERS To Be Issued`:
 *
 *   wage lane
 *     accrual   (UC-CASH-02)              Cr SHERS To Be Issued   · shares *earned*
 *     issuance  (UC-CASH-03 / DEFAULT-D)  Dr SHERS To Be Issued · Cr Investor Equity
 *                                         · shares *taken* (withdrawal or direct mint)
 *   vesting lane (restricted-stock grant, UC-VEST-01/02/03)
 *     accrual   (UC-VEST-01)              Cr SHERS To Be Issued   · the *whole award*
 *     issuance  (UC-VEST-02)              Dr SHERS To Be Issued · Cr Investor Equity
 *                                         · shares *released* (minted)
 *     issuance  (UC-VEST-03)              Dr SHERS To Be Issued · Cr Deferred SHER
 *                                         Compensation · the unvested remainder
 *                                         cancelled by a stop
 *
 * The lanes are matched separately (a wage withdrawal never consumes a vesting grant,
 * and vice versa), so each member's two promises are valued on their own terms.
 *
 * Every leg is first stamped at the multiplier of its **own date** (see `sherRate.ts`),
 * so an **issuance is already frozen at its withdraw/mint-date value** — the realization
 * price, which must never move again. This pass only re-values the **accrual** legs so
 * `SHERS To Be Issued` behaves correctly:
 *
 * - the accrual quantity **matched** by an issuance (FIFO per member, by SHER quantity)
 *   is re-valued to that issuance's date rate — equal to the issuance leg, so the two
 *   cancel `SHERS To Be Issued` to zero and Investor Equity keeps the realization value;
 * - the accrual quantity **still pending** (never withdrawn) is re-valued to the
 *   **current** multiplier, so open `SHERS To Be Issued` floats at today's rate until
 *   it is taken.
 *
 * A direct mint (DEFAULT-D) only settles accruals dated **before** it (shares granted
 * early must not absorb later wages); a withdrawal (UC-CASH-03) is unrestricted, since
 * its accrual is dated at week end and can post after an early payout. Any issued
 * quantity with no accrual behind it keeps its own-date value (cash-for-shares on the
 * day). An accrual that is partly withdrawn carries a quantity-weighted value: the
 * withdrawn part frozen, the rest current.
 *
 * In the vesting lane the same rule is what makes a grant net out exactly: the released
 * quantity is frozen at its release-date rate (so `SHERS To Be Issued` clears against
 * UC-VEST-02) and a stopped remainder at its stop-date rate (so the cancellation clears
 * against UC-VEST-03), leaving `Deferred SHER Compensation` equal to the shares actually
 * issued — net equity zero, nothing on the income statement.
 */
import { formatUnits } from 'viem'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { round6 } from '@/utils/accounting/toUsd'
import { getTokenDecimals } from '@/utils/constantUtil'

const SHERS_TO_BE_ISSUED = 'SHERS To Be Issued'
const INVESTOR_EQUITY = 'Investor Equity'
const DEFERRED_SHER_COMP = 'Deferred SHER Compensation'
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

/** The two promises that flow through `SHERS To Be Issued`, matched separately. */
type SherLane = 'wage' | 'vesting'

/**
 * The lane of the leg that **clears** `SHERS To Be Issued` — a wage withdrawal or
 * direct mint, a vesting release, or the cancellation of a stopped grant — or
 * `null` when the entry is not such a leg.
 */
function issuanceLane(entry: LedgerEntry): SherLane | null {
  if (entry.token !== 'sher' || entry.debit !== SHERS_TO_BE_ISSUED) return null
  if (entry.useCase === 'UC-CASH-03' || entry.useCase === 'DEFAULT-D') {
    return entry.credit === INVESTOR_EQUITY ? 'wage' : null
  }
  if (entry.useCase === 'UC-VEST-02') return entry.credit === INVESTOR_EQUITY ? 'vesting' : null
  if (entry.useCase === 'UC-VEST-03') return entry.credit === DEFERRED_SHER_COMP ? 'vesting' : null
  return null
}

/** The lane of the leg that **opens** `SHERS To Be Issued` — a wage accrual or a grant. */
function accrualLane(entry: LedgerEntry): SherLane | null {
  if (entry.token !== 'sher' || entry.credit !== SHERS_TO_BE_ISSUED) return null
  if (entry.useCase === 'UC-CASH-02') return 'wage'
  if (entry.useCase === 'UC-VEST-01') return 'vesting'
  return null
}

/** `${lane}|${member}` — a wage promise and a vesting grant queue independently. */
function laneKey(lane: SherLane, entry: LedgerEntry): string {
  return `${lane}|${(entry.counterparty ?? '').toLowerCase()}`
}

/** Narrow a `(entry, lane)` pair to the legs that belong to a lane. */
function isLaned(candidate: { entry: LedgerEntry; lane: SherLane | null }): candidate is {
  entry: LedgerEntry
  lane: SherLane
} {
  return candidate.lane !== null
}

/** FIFO queues of open accrual states, keyed by lane + member ({@link laneKey}). */
function buildAccrualQueues(entries: readonly LedgerEntry[]): {
  states: Map<string, AccrualState>
  queues: Map<string, AccrualState[]>
} {
  const states = new Map<string, AccrualState>()
  const queues = new Map<string, AccrualState[]>()
  const accruals = entries
    .map((entry) => ({ entry, lane: accrualLane(entry) }))
    .filter(isLaned)
    .sort((a, b) => a.entry.timestamp - b.entry.timestamp)
  for (const { entry, lane } of accruals) {
    const qty = sherQty(entry)
    if (qty <= 0) continue
    const state: AccrualState = { entry, totalQty: qty, matchedQty: 0, frozenValue: 0 }
    states.set(entry.id, state)
    const key = laneKey(lane, entry)
    queues.set(key, [...(queues.get(key) ?? []), state])
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
  // the matched accrual cancels the issuance exactly in `SHERS To Be Issued`.
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

  // Issuances consume their own lane's accrual queue, in chronological order (FIFO).
  const issuances = entries
    .map((entry) => ({ entry, lane: issuanceLane(entry) }))
    .filter(isLaned)
    .sort((a, b) => a.entry.timestamp - b.entry.timestamp)
  for (const { entry, lane } of issuances) {
    consumeAccruals(entry, queues.get(laneKey(lane, entry)))
  }

  return entries.map((entry) => {
    const state = states.get(entry.id)
    if (!state || accrualLane(entry) === null) return entry
    const pendingQty = state.totalQty - state.matchedQty
    const amountUsd = round6(state.frozenValue + pendingQty * currentSherRate)
    return { ...entry, amountUsd, rate: round6(amountUsd / state.totalQty) }
  })
}
