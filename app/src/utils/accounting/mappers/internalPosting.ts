import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { makeJournalEntryDraft, type JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import type { MapperContext } from './context'

interface InternalPostingRow {
  id: string
  contractAddress: string
  amount: string
  timestamp: number
}

interface InternalPostingAccounts {
  debit: AccountName
  credit: AccountName
  debitInstance?: string
  creditInstance?: string
  counterparty?: string
  memo: string
}

/** Build the identical pocket-to-pocket posting shared by Payroll and Expense. */
export function createInternalPosting(
  row: InternalPostingRow,
  token: string | null,
  ctx: MapperContext,
  accounts: InternalPostingAccounts
): JournalEntryDraft {
  const tokenId = ctx.tokenIdOf(token)
  return makeJournalEntryDraft({
    id: row.id,
    sourceContract: row.contractAddress,
    timestamp: row.timestamp,
    useCase: 'INTERNAL',
    debit: accounts.debit,
    debitInstance: accounts.debitInstance,
    credit: accounts.credit,
    creditInstance: accounts.creditInstance,
    token: tokenId,
    rawAmount: row.amount,
    counterparty: accounts.counterparty,
    internal: true,
    memo: accounts.memo
  })
}
