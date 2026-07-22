/**
 * CashRemuneration source mapper — payroll settlement (spec §4, UC-CASH-03).
 *
 * - `Withdraw` (native) / `WithdrawToken` (USDC): the cash leg settles the wage
 *   liability — Dr Wage Payable · Cr Cash — Payroll. Flagged `needs-off-chain-data`
 *   so the enrichment step can attach the `Wage`/`Claim` category (rate, minutes,
 *   memo).
 * - `WithdrawToken` where the token is **SHER**: the wage is paid in shares —
 *   Dr Shares to be issued · Cr Investor Equity (the equity leg of UC-CASH-03).
 *   The matching `InvestorV1 Minted` is therefore *not* re-booked by the investor
 *   mapper (it would double-count the equity).
 * - `Deposited`: internal funding of the payroll pocket from Bank — internal move.
 * - `OwnerTreasuryWithdraw*` (the `ownerWithdrawAllToBank` sweep): internal move
 *   back to Bank.
 */
import { formatUnits } from 'viem'
import type {
  CashRemunerationDepositRow,
  CashRemunerationWithdrawRow,
  CashRemunerationWithdrawTokenRow,
  CashRemunerationOwnerTreasuryWithdrawNativeRow,
  CashRemunerationOwnerTreasuryWithdrawTokenRow
} from '@/types/ponder/cash-remuneration'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { atDate, type MapperContext } from './context'

export interface CashRemunerationMapperInput {
  deposits?: readonly CashRemunerationDepositRow[]
  withdraws?: readonly CashRemunerationWithdrawRow[]
  withdrawTokens?: readonly CashRemunerationWithdrawTokenRow[]
  ownerTreasuryWithdrawNatives?: readonly CashRemunerationOwnerTreasuryWithdrawNativeRow[]
  ownerTreasuryWithdrawTokens?: readonly CashRemunerationOwnerTreasuryWithdrawTokenRow[]
}

const PAYROLL = 'Cash — Payroll' as const
const BANK = 'Cash — Bank' as const

/** Cash leg: settle the wage liability from the payroll pocket. */
function cashSettlement(
  row: { id: string; withdrawer: string; amount: string; timestamp: number },
  token: string | null,
  ctx: MapperContext
): LedgerEntry {
  const tokenId = ctx.tokenIdOf(token)
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'UC-CASH-03',
    debit: 'Wage Payable',
    credit: PAYROLL,
    amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
    token: tokenId,
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    memo: 'Wage withdrawal — cash settlement',
    enrichment: 'needs-off-chain-data'
  })
}

/** Share leg: wage paid in freshly issued SHER. */
function shareSettlement(row: CashRemunerationWithdrawTokenRow, ctx: MapperContext): LedgerEntry {
  return makeEntry({
    id: row.id,
    timestamp: row.timestamp,
    useCase: 'UC-CASH-03',
    debit: 'Shares to be issued',
    credit: 'Investor Equity',
    amountUsd: ctx.toUsd(BigInt(row.amount), 'sher', atDate(row.timestamp)),
    token: 'sher',
    rawAmount: row.amount,
    counterparty: row.withdrawer,
    shares: Number(formatUnits(BigInt(row.amount), 6)),
    memo: 'Wage paid in shares (SHER mint)',
    enrichment: 'needs-off-chain-data'
  })
}

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

/** Map every indexed CashRemuneration event to ledger entries. */
export function mapCashRemunerationEvents(
  input: CashRemunerationMapperInput,
  ctx: MapperContext
): LedgerEntry[] {
  const entries: LedgerEntry[] = []

  for (const row of input.deposits ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: PAYROLL,
        credit: ctx.pocketOf(row.depositor) ?? BANK,
        counterparty: row.depositor,
        memo: 'Internal funding into Payroll'
      })
    )
  }

  for (const row of input.withdraws ?? []) {
    if (BigInt(row.amount) <= 0n) continue
    entries.push(cashSettlement(row, null, ctx))
  }

  for (const row of input.withdrawTokens ?? []) {
    if (BigInt(row.amount) <= 0n) continue
    const isSher = ctx.tokenIdOf(row.tokenAddress) === 'sher'
    entries.push(isSher ? shareSettlement(row, ctx) : cashSettlement(row, row.tokenAddress, ctx))
  }

  for (const row of input.ownerTreasuryWithdrawNatives ?? []) {
    entries.push(
      internalMove(row, null, ctx, {
        debit: BANK,
        credit: PAYROLL,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Payroll → Bank'
      })
    )
  }

  for (const row of input.ownerTreasuryWithdrawTokens ?? []) {
    entries.push(
      internalMove(row, row.tokenAddress, ctx, {
        debit: BANK,
        credit: PAYROLL,
        counterparty: row.ownerAddress,
        memo: 'Owner sweep Payroll → Bank'
      })
    )
  }

  return entries
}
