import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

interface InternalPostingRow {
  id: string
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
): LedgerEntry {
  const tokenId = ctx.tokenIdOf(token)
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'INTERNAL',
    debit: accounts.debit,
    debitInstance: accounts.debitInstance,
    credit: accounts.credit,
    creditInstance: accounts.creditInstance,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: accounts.counterparty,
    internal: true,
    memo: accounts.memo
  })
}
