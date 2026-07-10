/**
 * General-ledger presentation transform: fold each Bank protocol fee into the
 * transfer it was skimmed on, so the ledger shows **one compound entry per
 * transfer** (Dr destination · Dr fee · Cr Bank gross) instead of two separate
 * postings.
 *
 * On-chain, `Bank.transfer` pays the fee (emitting `FeePaid`) and emits `Transfer`
 * in the **same transaction**, so a fee and its transfer share a transaction hash.
 * Both are indexed with an id of the shape `${txHash}-${logIndex}`, so the tx hash
 * is the id with its `-logIndex` suffix stripped — that is the pairing key.
 *
 * Presentation-only: the canonical feed keeps both postings, so the trial balance
 * and the statements never double count — this only reshapes what the ledger view
 * and its exports render.
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

  const folded = new Set<string>() // ids of fee postings folded into a transfer
  const out: LedgerEntry[] = []
  for (const entry of entries) {
    if (isBankOutflow(entry)) {
      const fee = feeByTx.get(txHashOf(entry))
      if (fee && fee.id !== entry.id) {
        folded.add(fee.id)
        out.push({
          ...entry,
          mergedBankFee: {
            amountUsd: fee.amountUsd,
            rawAmount: fee.rawAmount,
            token: fee.token,
            ...(fee.rate != null ? { rate: fee.rate } : {})
          }
        })
        continue
      }
    }
    out.push(entry)
  }
  return out.filter((entry) => !folded.has(entry.id))
}
