/**
 * Direct SHER issuance with no wage behind it.
 *
 * A direct mint (DEFAULT-D) clears `SHERS To Be Issued` on the assumption that it
 * hands out SHER the shareholder already earned in wages. When the shareholder is
 * owed no such SHER — an investor or an advisor, or a mint larger than the wages
 * still owed — clearing it would push `SHERS To Be Issued` onto its debit side and
 * hide the SHER other members are still owed. That excess is issued for no recorded
 * consideration, so it is booked like a released grant — Dr Deferred SHER
 * Compensation · Cr Investor Equity — which leaves total equity unchanged.
 */
import { draftOperationIdOf, type JournalEntryDraft } from './journalEntryDraft'
import { sherRawAmount } from './sherIssuance'

const SHERS_TO_BE_ISSUED = 'SHERS To Be Issued'
const DEFERRED_SHER_COMP = 'Deferred SHER Compensation'

function isSherLeg(entry: JournalEntryDraft, useCase: JournalEntryDraft['useCase']): boolean {
  return entry.token === 'sher' && entry.useCase === useCase
}

function isWageAccrual(entry: JournalEntryDraft): boolean {
  return isSherLeg(entry, 'UC-CASH-02') && entry.credit === SHERS_TO_BE_ISSUED
}

function isWageWithdrawal(entry: JournalEntryDraft): boolean {
  return isSherLeg(entry, 'UC-CASH-03') && entry.debit === SHERS_TO_BE_ISSUED
}

function isDirectMint(entry: JournalEntryDraft): boolean {
  return isSherLeg(entry, 'DEFAULT-D') && entry.debit === SHERS_TO_BE_ISSUED
}

function shareholderOf(entry: JournalEntryDraft): string {
  return (entry.counterparty ?? '').toLowerCase()
}

/** SHER each shareholder earned in wages and has not withdrawn, in base units. */
function owedWageSher(entries: readonly JournalEntryDraft[]): Map<string, bigint> {
  const owed = new Map<string, bigint>()
  for (const entry of entries) {
    const sign = isWageAccrual(entry) ? 1n : isWageWithdrawal(entry) ? -1n : 0n
    if (sign === 0n) continue
    const shareholder = shareholderOf(entry)
    owed.set(shareholder, (owed.get(shareholder) ?? 0n) + sign * sherRawAmount(entry))
  }
  return owed
}

/** SHER the shareholder had earned in wages by `timestamp`, in base units. */
function accruedWageSher(
  entries: readonly JournalEntryDraft[],
  shareholder: string,
  timestamp: number
): bigint {
  return entries
    .filter(
      (entry) =>
        isWageAccrual(entry) && shareholderOf(entry) === shareholder && entry.timestamp <= timestamp
    )
    .reduce((sum, entry) => sum + sherRawAmount(entry), 0n)
}

function smaller(a: bigint, b: bigint): bigint {
  return a < b ? a : b
}

/**
 * The part of each direct mint that pays owed wages, in chronological order. A mint
 * covers at most what the shareholder is still owed overall and, like the settlement
 * pass, only wages accrued by its date: shares granted early must not absorb later wages.
 */
function wageBackedMintAmounts(entries: readonly JournalEntryDraft[]): Map<string, bigint> {
  const owed = owedWageSher(entries)
  const coveredSoFar = new Map<string, bigint>()
  const backed = new Map<string, bigint>()
  const mints = entries.filter(isDirectMint).sort((a, b) => a.timestamp - b.timestamp)
  for (const mint of mints) {
    const shareholder = shareholderOf(mint)
    const accrued = accruedWageSher(entries, shareholder, mint.timestamp)
    const previouslyCovered = coveredSoFar.get(shareholder) ?? 0n
    const available = smaller(owed.get(shareholder) ?? 0n, accrued) - previouslyCovered
    const covered = available > 0n ? smaller(sherRawAmount(mint), available) : 0n
    coveredSoFar.set(shareholder, previouslyCovered + covered)
    backed.set(mint.id, covered)
  }
  return backed
}

/**
 * Re-book the part of each direct mint that pays no owed wage against Deferred SHER
 * Compensation. A mint that is partly owed splits into two legs of the same source
 * operation. Pure: returns new drafts in source order.
 */
export function splitUnbackedIssuance(entries: readonly JournalEntryDraft[]): JournalEntryDraft[] {
  const backedAmounts = wageBackedMintAmounts(entries)

  return entries.flatMap((entry) => {
    const backed = backedAmounts.get(entry.id)
    if (backed === undefined) return [entry]
    const unbacked = sherRawAmount(entry) - backed
    if (unbacked <= 0n) return [entry]
    if (backed === 0n) return [{ ...entry, debit: DEFERRED_SHER_COMP }]

    return [
      { ...entry, rawAmount: String(backed) },
      {
        ...entry,
        id: `${entry.id}:unbacked`,
        sourceOperationId: draftOperationIdOf(entry),
        debit: DEFERRED_SHER_COMP,
        rawAmount: String(unbacked)
      }
    ]
  })
}
