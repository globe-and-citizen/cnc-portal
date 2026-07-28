/**
 * General-ledger presentation transform: fold each Bank protocol fee into the
 * transfer it was skimmed on, so the ledger shows **one compound entry per
 * transfer** (Dr destination · Dr fee · Cr Bank gross) instead of two postings.
 *
 * `Bank.transfer` pays the fee and sends the net in the **same transaction**, so a
 * fee and its transfer share a transaction hash — the pairing key, recovered from
 * the indexed-event id (`${txHash}-${logIndex}`).
 *
 * Presentation-only: the canonical feed keeps both postings, so the trial balance
 * and the statements never double count.
 */
import type { LedgerEntry } from './ledgerEntry'

/**
 * The on-chain transaction hash behind a posting, parsed from its indexed-event
 * id (`${txHash}-${logIndex}`). Falls back to the whole id when it has no suffix.
 */
export function txHashOf(entry: LedgerEntry): string {
  const dash = entry.id.lastIndexOf('-')
  return dash > 0 ? entry.id.slice(0, dash) : entry.id
}

/** The Bank protocol-fee posting (the 0.5% skim leaving the Bank). */
function isBankFee(entry: LedgerEntry): boolean {
  return entry.useCase === 'FEE' && entry.credit === 'Cash — Bank'
}

/** A Bank outflow a fee attaches to: a non-fee posting that credits the Bank. */
function isBankOutflow(entry: LedgerEntry): boolean {
  return entry.useCase !== 'FEE' && entry.credit === 'Cash — Bank' && entry.debit != null
}

/**
 * Fold each Bank fee into its same-transaction transfer, dropping the standalone
 * fee posting. A fee whose transfer is not in the feed (e.g. filtered out by
 * category) stays a standalone posting.
 */
export function mergeBankFees(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const feeByTx = new Map<string, LedgerEntry>()
  for (const entry of entries) {
    if (isBankFee(entry)) feeByTx.set(txHashOf(entry), entry)
  }
  if (feeByTx.size === 0) return entries.slice()

  // Fold in one pass, then drop the fees that were folded — an unpaired fee (its
  // transfer filtered out of this view) is left in place as its own posting.
  const folded = new Set<string>()
  const merged = entries.map((entry) => {
    if (!isBankOutflow(entry)) return entry
    const fee = feeByTx.get(txHashOf(entry))
    if (!fee || fee.id === entry.id) return entry
    folded.add(fee.id)
    return {
      ...entry,
      mergedBankFee: {
        amountUsd: fee.amountUsd,
        rawAmount: fee.rawAmount,
        token: fee.token,
        ...(fee.rate != null ? { rate: fee.rate } : {})
      }
    }
  })
  return folded.size === 0 ? merged : merged.filter((entry) => !folded.has(entry.id))
}
