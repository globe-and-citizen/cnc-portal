/**
 * Vesting source mapper — share vesting grants, releases and stops (spec §4,
 * UC-VEST-01/02/03).
 *
 * A vesting schedule is an **agreement only**: no tokens move when it is created,
 * and its shares (the team's Investor/SHER share token) are minted on demand,
 * capped to what has actually vested, when the member calls `release` (or when the
 * owner `stopVesting`s). So the books recognise the equity **at the mint**, on a
 * settlement basis, mirroring the SHER-wage treatment (issue #2458 — share-based
 * compensation is an equity transaction, never an income-statement expense):
 *
 *   - **VestingCreated** (grant) → UC-VEST-01, a **memo-only** entry (no monetary
 *     legs): it records the promised share count only, like signing a wage claim.
 *   - **TokensReleased** (mint, via `release` or `stopVesting`) → UC-VEST-02,
 *     `Dr Deferred SHER Compensation · Cr Investor Equity` for the minted amount,
 *     valued at the SHER rate of record. This is the net of the two SHER-wage legs
 *     collapsed (accrual + issuance), legitimate here because a vesting release
 *     vests-and-mints atomically: the shares issued (Investor Equity ↑) are
 *     neutralised by the contra-equity (Deferred SHER Compensation ↑), so net book
 *     equity is unchanged and nothing hits the income statement.
 *   - **VestingStopped** (stop) → UC-VEST-03, a **memo-only** entry: the unvested
 *     remainder is dropped, never minted, so it was never booked — there is nothing
 *     to reverse.
 *
 * The `Investor Minted` event emitted in the **same transaction** as a
 * `TokensReleased` is therefore recognised as **backed** by the investor mapper
 * (keyed by member + amount) and *not* re-booked as a direct mint (Default-D),
 * which would double-count the equity and drive `SHERS To Be Issued` negative.
 */
import { formatUnits } from 'viem'
import type {
  VestingCreatedRow,
  VestingTokensReleasedRow,
  VestingStoppedRow
} from '@/types/ponder/vesting'
import { makeEntry, type LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { atDate, type MapperContext } from './context'

export interface VestingMapperInput {
  createds?: readonly VestingCreatedRow[]
  releases?: readonly VestingTokensReleasedRow[]
  stoppeds?: readonly VestingStoppedRow[]
}

/** Whole-unit SHER share count from a base-unit amount (SHER has 6 decimals). */
function shareCount(amount: string): number {
  return Number(formatUnits(BigInt(amount), 6))
}

/** Map every indexed Vesting event to its ledger entry. */
export function mapVestingEvents(input: VestingMapperInput, ctx: MapperContext): LedgerEntry[] {
  const entries: LedgerEntry[] = []

  for (const row of input.createds ?? []) {
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-VEST-01',
        debit: null,
        credit: null,
        amountUsd: 0,
        token: 'sher',
        rawAmount: row.amount,
        counterparty: row.member,
        shares: shareCount(row.amount),
        memo: 'Vesting grant created — shares promised, none minted yet'
      })
    )
  }

  for (const row of input.releases ?? []) {
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-VEST-02',
        debit: 'Deferred SHER Compensation',
        credit: 'Investor Equity',
        amountUsd: ctx.toUsd(BigInt(row.amount), 'sher', atDate(row.timestamp)),
        token: 'sher',
        rawAmount: row.amount,
        counterparty: row.member,
        shares: shareCount(row.amount),
        memo: 'Vested shares released — shares issued to equity'
      })
    )
  }

  for (const row of input.stoppeds ?? []) {
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-VEST-03',
        debit: null,
        credit: null,
        amountUsd: 0,
        token: 'sher',
        rawAmount: '0',
        counterparty: row.member,
        memo: 'Vesting schedule stopped — unvested remainder dropped'
      })
    )
  }

  return entries
}
