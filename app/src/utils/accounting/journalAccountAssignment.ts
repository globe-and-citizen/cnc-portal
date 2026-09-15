/** Direct counter-account assignment at the validated JournalEntry boundary. */
import type { JournalAccountAssignmentRecord } from '@/types/journal-account-assignment'
import { accountFor } from './accountRegistry'
import { ACCOUNT_FAMILIES, accountFamilyById } from './chartOfAccounts'
import { createJournalEntry, debitOf } from './journalEntry'
import { ZERO_USD_AMOUNT } from './monetaryAmount'
import type { Account, JournalEntry } from './types'

/** Canonical accounts offered for an eligible external treasury outflow. */
export const JOURNAL_ASSIGNABLE_ACCOUNTS: readonly Account[] = ACCOUNT_FAMILIES.filter(
  (family) => 'manualAssignment' in family && family.manualAssignment === 'external-outflow'
).map((family) => accountFor(family.name))

const ASSIGNABLE_ACCOUNT_IDS = new Set(JOURNAL_ASSIGNABLE_ACCOUNTS.map((account) => account.id))

/** Whether an API value names an account allowed by the canonical chart. */
function isJournalAssignableAccountId(accountId: string): boolean {
  return ASSIGNABLE_ACCOUNT_IDS.has(accountId)
}

function assignableLineIndex(entry: JournalEntry): number {
  const matches = entry.lines.flatMap((line, index) =>
    debitOf(line) > ZERO_USD_AMOUNT &&
    !line.account.family.name.startsWith('Cash — ') &&
    line.account.family.name !== 'Transaction Fee Expense'
      ? [index]
      : []
  )
  return matches.length === 1 ? matches[0]! : -1
}

/**
 * Apply persisted account IDs directly to eligible JournalEntry lines. No category
 * or mapper translation participates; every resulting entry is revalidated.
 */
export function applyJournalAccountAssignments(
  journal: readonly JournalEntry[],
  records: readonly JournalAccountAssignmentRecord[] | null | undefined
): JournalEntry[] {
  const byEntry = new Map(
    (records ?? []).map((record) => [record.journalEntryId.toLowerCase(), record])
  )

  return journal.map((entry) => {
    if (!entry.accountAssignment?.editable) return entry
    const record = byEntry.get(entry.id.toLowerCase())
    if (!record || !isJournalAssignableAccountId(record.accountId)) return entry

    const family = accountFamilyById(record.accountId)
    const lineIndex = assignableLineIndex(entry)
    if (!family || lineIndex < 0) return entry

    const lines = entry.lines.map((line, index) =>
      index === lineIndex ? { ...line, account: accountFor(family.name) } : line
    )
    const memo = record.memo?.trim()
    return createJournalEntry({
      ...entry,
      accountAssignment: {
        editable: true,
        accountId: record.accountId,
        ...(memo ? { memo } : {})
      },
      lines
    })
  })
}
