/** Account-assignment screen projection of complete JournalEntry records. */
import { accountFamilyById } from './chartOfAccounts'
import {
  filterJournalLedgerEntries,
  journalLedgerRows,
  type LedgerRow
} from './journalLedgerPresenter'
import type { AccountId, JournalEntry } from './types'

export interface JournalAccountAssignmentTarget {
  journalEntryId: string
  accountId?: AccountId
  memo?: string
}

export interface JournalAccountAssignmentRow extends LedgerRow {
  journalEntryId: string
  target?: JournalAccountAssignmentTarget
  savedDecision?: string
  reviewRequired: boolean
}

/**
 * Reuse the exact journal lines shown by the General Ledger. Assignment metadata
 * controls only the editor and note; selected accounts already live on the lines.
 */
export function presentJournalAccountAssignments(journal: readonly JournalEntry[]): {
  rows: JournalAccountAssignmentRow[]
  entryCount: number
} {
  const entries = filterJournalLedgerEntries(journal).filter(
    (entry) => entry.kind === 'monetary' && entry.accountAssignment
  )
  const displayedLines = journalLedgerRows(entries, journal)
  let index = 0
  const rows = entries.flatMap((entry) => {
    const assignment = entry.accountAssignment!
    const target = assignment.editable
      ? {
          journalEntryId: entry.id,
          ...(assignment.accountId ? { accountId: assignment.accountId } : {}),
          ...(assignment.memo ? { memo: assignment.memo } : {})
        }
      : undefined
    const family = assignment.accountId ? accountFamilyById(assignment.accountId) : undefined
    const savedDecision = family
      ? `${family.name}${assignment.memo ? ` — ${assignment.memo}` : ''}`
      : undefined

    return entry.lines.map(() => ({
      ...displayedLines[index++]!,
      journalEntryId: entry.id,
      target,
      ...(savedDecision ? { savedDecision } : {}),
      reviewRequired: !assignment.editable
    }))
  })
  return { rows, entryCount: entries.length }
}
