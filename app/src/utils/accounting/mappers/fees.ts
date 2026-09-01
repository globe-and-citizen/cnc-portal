/**
 * Fee source mapper — the Bank protocol fee is a real **expense** leaving the
 * treasury: it is skimmed to the protocol-wide FeeCollector (not a team pocket),
 * so it is a cost, not a cash-to-cash internal move.
 *
 *     Dr Transaction Fee Expense   (fee)
 *        Cr Cash — Bank            (fee)
 *
 * It therefore surfaces in the general ledger, trial balance and income
 * statement, and rolls up into the Summary's total expenses. (Network / gas fees
 * paid to validators are a separate cost with no data feed yet — see
 * `chartOfAccounts` scope notes — so they are not booked here.)
 *
 * The same fee is written twice on-chain — once by Bank (`FeePaid`) and once by
 * FeeCollector (`FeePaid`). We dedup the dual-write on (token, amount, timestamp)
 * so the fee is booked exactly once. The Bank row is canonical when both exist.
 */
import type { BankFeePaidRow } from '@/types/ponder/bank'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

/** A `FeePaid` row emitted by the FeeCollector contract (the dual-write twin). */
export interface FeeCollectorFeePaidRow {
  id: string
  contractAddress: string
  payer: string
  token: string | null
  amount: string
  timestamp: number
}

export interface FeeMapperInput {
  /** `FeePaid` rows emitted by the Bank contract (`bankFeePaids`). */
  bankFeePaids?: readonly BankFeePaidRow[]
  /** `FeePaid` rows emitted by the FeeCollector contract (`feeCollectorFeePaids`). */
  feeCollectorFeePaids?: readonly FeeCollectorFeePaidRow[]
}

/** Dedup key for the dual-write: a fee is one economic event across both logs. */
function feeKey(row: { token: string | null; amount: string; timestamp: number }): string {
  return `${(row.token ?? 'native').toLowerCase()}|${row.amount}|${row.timestamp}`
}

/** Map deduped fee skims to internal Bank → FeeCollector moves. */
export function mapFees(input: FeeMapperInput, ctx: MapperContext): LedgerEntry[] {
  const seen = new Set<string>()
  const entries: LedgerEntry[] = []

  const push = (row: { id: string; token: string | null; amount: string; timestamp: number }) => {
    const key = feeKey(row)
    if (seen.has(key)) return
    seen.add(key)
    const tokenId = ctx.tokenIdOf(row.token)
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        credit: 'Cash — Bank',
        amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
        token: tokenId,
        rawAmount: row.amount,
        memo: 'Transaction fee skimmed from Bank'
      })
    )
  }

  // Bank rows first so they win the dedup as the canonical source.
  for (const row of input.bankFeePaids ?? []) push(row)
  for (const row of input.feeCollectorFeePaids ?? []) push(row)
  return entries
}
