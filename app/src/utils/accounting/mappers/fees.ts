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
 * `FeePaid` evidence belongs to a successful Bank outflow in the same source
 * operation. A fee row without that counterpart is incomplete evidence: it is
 * intentionally withheld from the books and reported for reconciliation, never
 * projected as a fee-only JournalEntry.
 */
import type { BankFeePaidRow } from '@/types/ponder/bank'
import { makeEntry, sourceOperationIdOf, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
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
  /** Bank-paid fee rows, indexed from FeeCollector with the Bank as payer. */
  bankFeePaids?: readonly BankFeePaidRow[]
  /** Optional duplicate FeeCollector rows for a feed that indexes both perspectives. */
  feeCollectorFeePaids?: readonly FeeCollectorFeePaidRow[]
  /**
   * Source operations with a separate Bank outflow event. When supplied, only a
   * matching `FeePaid` is bookable. Omitting it retains the mapper's narrow,
   * standalone unit-test mode; production assembly always supplies this evidence.
   */
  outflowOperationIds?: Iterable<string>
}

/** Dedup key for duplicate perspectives of the same fee operation. */
function feeKey(row: { id: string; token: string | null; amount: string }): string {
  return `${sourceOperationIdOf(row.id)}|${(row.token ?? 'native').toLowerCase()}|${row.amount}`
}

/** Source operations with fee evidence but no Bank outflow evidence. */
export function unmatchedFeeOperationIds(input: FeeMapperInput): string[] {
  if (!input.outflowOperationIds) return []

  const outflows = new Set(input.outflowOperationIds)
  const unmatched = new Set<string>()
  for (const row of [...(input.bankFeePaids ?? []), ...(input.feeCollectorFeePaids ?? [])]) {
    const operationId = sourceOperationIdOf(row.id)
    if (!outflows.has(operationId)) unmatched.add(operationId)
  }
  return [...unmatched]
}

/** Map fee skims that have a Bank outflow counterpart into ordinary journal lines. */
export function mapFees(input: FeeMapperInput, ctx: MapperContext): LedgerEntry[] {
  const seen = new Set<string>()
  const entries: LedgerEntry[] = []
  const unmatched = new Set(unmatchedFeeOperationIds(input))

  const push = (
    row: { id: string; token: string | null; amount: string; timestamp: number },
    // The Bank contract the fee's cash left, so the credit leg is scoped to the
    // same deployment as the transfer it was skimmed on — a redeployed Bank shows
    // its own fees under `Cash — Bank 2` rather than folding them into the first.
    instance: string
  ) => {
    const operationId = sourceOperationIdOf(row.id)
    if (unmatched.has(operationId)) return

    const key = feeKey(row)
    if (seen.has(key)) return
    seen.add(key)
    const tokenId = ctx.tokenIdOf(row.token)
    entries.push(
      makeEntry({
        id: row.id,
        sourceOperationId: operationId,
        timestamp: row.timestamp,
        useCase: 'FEE',
        debit: 'Transaction Fee Expense',
        credit: 'Cash — Bank',
        creditInstance: instance,
        amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
        token: tokenId,
        rawAmount: row.amount,
        memo: 'Transaction fee skimmed from Bank'
      })
    )
  }

  // Bank rows first so they win the dedup as the canonical source. The indexed
  // row names the paying Bank in `contractAddress`; the optional FeeCollector
  // twin names it as `payer`, so either way the credit is scoped to that Bank.
  for (const row of input.bankFeePaids ?? []) push(row, row.contractAddress)
  for (const row of input.feeCollectorFeePaids ?? []) push(row, row.payer)
  return entries
}
