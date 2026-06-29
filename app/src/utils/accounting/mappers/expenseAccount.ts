/**
 * ExpenseAccount source mapper — operating expense payouts (spec §4, UC-EXP-01).
 *
 * - `Transfer` / `TokenTransfer` to an external member: an approved expense payout
 *   — Dr Operating Expense · Cr Cash — Expense. Flagged `needs-off-chain-data` so
 *   the enrichment step can attach the `Expense` budget category. A transfer to an
 *   internal pocket is instead an internal move.
 * - `Deposited` / `TokenDeposited`: internal funding of the expense pocket from
 *   Bank — internal move.
 * - `OwnerTreasuryWithdraw*` (the `ownerWithdrawAllToBank` sweep): internal move
 *   back to Bank.
 */
import type {
  ExpenseDepositRow,
  ExpenseTokenDepositRow,
  ExpenseTransferRow,
  ExpenseTokenTransferRow,
  ExpenseOwnerTreasuryWithdrawNativeRow,
  ExpenseOwnerTreasuryWithdrawTokenRow
} from '@/types/ponder/expense'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { atDate, type MapperContext } from './context'

export interface ExpenseMapperInput {
  deposits?: readonly ExpenseDepositRow[]
  tokenDeposits?: readonly ExpenseTokenDepositRow[]
  transfers?: readonly ExpenseTransferRow[]
  tokenTransfers?: readonly ExpenseTokenTransferRow[]
  ownerTreasuryWithdrawNatives?: readonly ExpenseOwnerTreasuryWithdrawNativeRow[]
  ownerTreasuryWithdrawTokens?: readonly ExpenseOwnerTreasuryWithdrawTokenRow[]
}

const EXPENSE = 'Cash — Expense' as const
const BANK = 'Cash — Bank' as const

/** A pocket-to-pocket move that nets out of the income statement. */
function internalMove(
  row: { id: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext,
  opts: { debit: AccountName; credit: AccountName; counterparty?: string; memo: string }
): LedgerEntry {
  const tokenId = ctx.tokenIdOf(token)
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'INTERNAL',
    debit: opts.debit,
    credit: opts.credit,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: opts.counterparty,
    internal: true,
    memo: opts.memo
  })
}

/** Map an approved payout (or an internal move when the recipient is a pocket). */
function mapTransfer(
  row: { id: string; to: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext
): LedgerEntry {
  const destPocket = ctx.pocketOf(row.to)
  if (destPocket) {
    return internalMove(row, token, ctx, {
      debit: destPocket,
      credit: EXPENSE,
      counterparty: row.to,
      memo: `Internal move Expense → ${destPocket}`
    })
  }

  const tokenId = ctx.tokenIdOf(token)
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'UC-EXP-01',
    debit: 'Operating Expense',
    credit: EXPENSE,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.to,
    memo: 'Approved expense payout',
    enrichment: 'needs-off-chain-data'
  })
}

/** Map every indexed ExpenseAccount event to ledger entries. */
export function mapExpenseAccountEvents(
  input: ExpenseMapperInput,
  ctx: MapperContext
): LedgerEntry[] {
  const entries: LedgerEntry[] = []

  for (const row of input.deposits ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: EXPENSE,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        counterparty: row.depositor,
        memo: 'Internal funding into Expense'
      })
    )
  }

  for (const row of input.tokenDeposits ?? []) {
    entries.push(
      internalMove(row, row.token, ctx, {
        debit: EXPENSE,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        counterparty: row.depositor,
        memo: 'Internal funding into Expense'
      })
    )
  }

  for (const row of input.transfers ?? []) {
    entries.push(mapTransfer(row, null, ctx))
  }

  for (const row of input.tokenTransfers ?? []) {
    entries.push(mapTransfer(row, row.token, ctx))
  }

  for (const row of input.ownerTreasuryWithdrawNatives ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: BANK,
        credit: EXPENSE,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Expense → Bank'
      })
    )
  }

  for (const row of input.ownerTreasuryWithdrawTokens ?? []) {
    entries.push(
      internalMove(row, row.token, ctx, {
        debit: BANK,
        credit: EXPENSE,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Expense → Bank'
      })
    )
  }

  return entries
}
