/**
 * Fee source mapper — a fee on a Bank transfer is an **internal move**, not an
 * expense (spec §5.1): cash shifts from the Bank pocket to the FeeCollector
 * pocket, both CNC-owned. It nets out of the income statement; it only
 * redistributes cash.
 *
 *     Dr Cash — FeeCollector   (fee)
 *        Cr Cash — Bank        (fee)
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
        debit: 'Cash — FeeCollector',
        credit: 'Cash — Bank',
        amountUsd: ctx.toUsd(BigInt(row.amount), tokenId, atDate(row.timestamp)),
        token: tokenId,
        rawAmount: row.amount,
        internal: true,
        memo: 'Fee skim Bank → FeeCollector (internal move)'
      })
    )
  }

  // Bank rows first so they win the dedup as the canonical source.
  for (const row of input.bankFeePaids ?? []) push(row)
  for (const row of input.feeCollectorFeePaids ?? []) push(row)
  return entries
}
