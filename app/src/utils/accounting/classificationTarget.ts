/** Legacy persistence metadata captured before source postings are grouped into a journal entry. */
import type { LedgerEntry } from './ledgerEntry'
import type { ClassificationCategory } from './classification'

export interface LegacyClassificationTarget {
  /** Exact key expected by the existing API; it is not necessarily the journal transaction hash. */
  sourceEntryId: string
  category?: ClassificationCategory
  memo?: string
}

/**
 * Only generic external Bank/Safe withdrawals accept an override in the source
 * mappers. Deposits, internal movements, fees and system-owned payouts retain
 * their evidence-derived accounts. No monetary values cross this API boundary.
 */
export function legacyClassificationTargetOf(
  entry: LedgerEntry
): LegacyClassificationTarget | null {
  if (entry.internal || entry.useCase !== 'CASH-OUT') return null
  if (entry.credit !== 'Cash — Bank' && entry.credit !== 'Cash — Safe') return null
  if (
    !entry.debit ||
    entry.debit.startsWith('Cash — ') ||
    entry.debit === 'Transaction Fee Expense'
  )
    return null

  return {
    sourceEntryId: entry.id,
    ...(entry.classified ? { category: entry.classified, memo: entry.memo } : {})
  }
}
