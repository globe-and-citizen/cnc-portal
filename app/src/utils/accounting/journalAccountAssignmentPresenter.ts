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

export const ACCOUNT_ASSIGNMENTS_TITLE = 'Account Assignments'

/** The Account Assignments columns, shared by the screen and both exporters. */
export const ACCOUNT_ASSIGNMENT_COLUMNS = [
  { value: 'date', label: 'Date' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'txHash', label: 'Tx hash' },
  { value: 'account', label: 'Account' },
  { value: 'currency', label: 'Currency' },
  { value: 'dr', label: 'Debit (USD)' },
  { value: 'cr', label: 'Credit (USD)' },
  { value: 'assignment', label: 'Account assignment' }
] as const

export const DEFAULT_ASSIGNMENT = 'Default account — not yet reviewed'
export const COMBINED_MOVEMENTS_NOTE =
  'This journal entry combines movements and cannot receive one account assignment.'

/**
 * The printed "Account assignment" cell of a journal entry's first line: the saved
 * account (and note), or that it still sits on its default, preceded by the read-only notice
 * for a compound entry. Blank on the entry's follow-up lines, as on screen.
 */
export function assignmentStatus({
  isFirst,
  reviewRequired,
  savedDecision
}: Pick<JournalAccountAssignmentRow, 'isFirst' | 'reviewRequired' | 'savedDecision'>): string {
  if (!isFirst) return ''
  const decision = savedDecision ?? DEFAULT_ASSIGNMENT
  return reviewRequired ? `${COMBINED_MOVEMENTS_NOTE} ${decision}` : decision
}
