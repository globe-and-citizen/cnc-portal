import type { AccountId } from '@/utils/accounting/types'

/** One owner-selected counter-account returned by the Accounting API. */
export interface JournalAccountAssignmentRecord {
  id: number
  teamId: number
  /** Canonical transaction hash and JournalEntry identity. */
  journalEntryId: string
  /** Stable account-family identity from the canonical chart of accounts. */
  accountId: AccountId
  memo: string | null
  assignedByAddress: string | null
  createdAt: string
  updatedAt: string
  assignedBy?: {
    name: string | null
    address: string
    imageUrl: string | null
  } | null
}
