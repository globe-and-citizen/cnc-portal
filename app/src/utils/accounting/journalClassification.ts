/** Classification is a projection of complete journal entries, with a legacy edit boundary. */
import { CATEGORY_LABEL } from './classification'
import type { LegacyClassificationTarget } from './classificationTarget'
import type { JournalEntry } from './journalEntry'
import { filterJournalLedgerEntries, journalLedgerRows } from './journalLedgerPresenter'
import type { LedgerRow } from './journalLedgerPresenter'

export interface JournalClassificationRow extends LedgerRow {
  journalEntryId: string
  target?: LegacyClassificationTarget
  savedDecisions: string[]
  reviewRequired: boolean
}

/**
 * Reuse ledger lines and full-book labels so fees, currencies and deployment
 * identities are identical to the reports. Source metadata supplies only the
 * existing mutation key and owner decision, never the displayed accounts/amounts.
 */
export function presentJournalClassification(journal: readonly JournalEntry[]): {
  rows: JournalClassificationRow[]
  entryCount: number
} {
  const entries = filterJournalLedgerEntries(journal).filter(
    (entry) => entry.kind === 'monetary' && entry.legacyClassification?.targets.length
  )
  const displayedLines = journalLedgerRows(entries, journal)
  let index = 0
  const rows = entries.flatMap((entry) => {
    const classification = entry.legacyClassification!
    // Even a stale manual category must not make a cash-to-cash journal editable.
    const hasCashDebit = entry.lines.some(
      (line) => line.debit !== undefined && line.account.family.name.startsWith('Cash — ')
    )
    const editable = classification.editable && !entry.internal && !hasCashDebit
    const target = editable ? classification.targets[0] : undefined
    const savedDecisions = classification.targets.flatMap((decision) =>
      decision.category
        ? [`${CATEGORY_LABEL[decision.category]}${decision.memo ? ` — ${decision.memo}` : ''}`]
        : []
    )
    return entry.lines.map(() => ({
      ...displayedLines[index++]!,
      journalEntryId: entry.id,
      target,
      savedDecisions,
      reviewRequired: !editable
    }))
  })
  return { rows, entryCount: entries.length }
}
