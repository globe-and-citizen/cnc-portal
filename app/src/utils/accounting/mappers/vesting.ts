/**
 * Vesting source mapper — share vesting grants, releases and stops (spec §4,
 * UC-VEST-01/02/03).
 *
 * Share vesting is booked as a **restricted-stock grant** on the SHER structure
 * (see `docs/features/accounting/vesting-accounting-restricted-stock.md`): the
 * award is recognised the moment the schedule is defined, and every later event
 * settles that grant. Nothing ever reaches the income statement — share-based
 * compensation is an equity transaction (issue #2458):
 *
 *   - **VestingCreated** (grant) → UC-VEST-01, `Dr Deferred SHER Compensation ·
 *     Cr SHERS To Be Issued` for the **full promised award**. The contract mints
 *     nothing at grant, so the credit is the interim `SHERS To Be Issued`
 *     (promised, unminted) rather than `Investor Equity`; the contra-equity debit
 *     offsets it exactly, so total equity is unchanged. This is the accrual leg of
 *     the SHER wage cycle, booked upfront for the whole award.
 *   - **TokensReleased** (mint, via `release` or `stopVesting`) → UC-VEST-02,
 *     `Dr SHERS To Be Issued · Cr Investor Equity` for the minted amount. Promised
 *     shares become issued shares, so `Investor Equity` still reconciles to the
 *     on-chain SHER supply — it is credited only at an actual mint.
 *   - **VestingStopped** (stop) → UC-VEST-03, `Dr SHERS To Be Issued ·
 *     Cr Deferred SHER Compensation` for the **unvested remainder**, unwinding the
 *     part of the grant that will never be minted. The vested-but-unreleased part
 *     is minted in the same transaction and is already booked by its own
 *     `TokensReleased` (UC-VEST-02), so the stop only reverses what is forfeited.
 *
 * The `Investor Minted` event emitted in the **same transaction** as a
 * `TokensReleased` is therefore recognised as **backed** by the investor mapper
 * (keyed by member + amount) and *not* re-booked as a direct mint (Default-D),
 * which would double-count the equity.
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

/** One schedule's identity — a member's Nth schedule on one Vesting contract. */
interface ScheduleRef {
  contractAddress: string
  member: string
  scheduleIndex: string
}

/** Whole-unit SHER share count from a base-unit amount (SHER has 6 decimals). */
function shareCount(amount: string): number {
  return Number(formatUnits(BigInt(amount), 6))
}

/** `${vestingContract}|${member}|${index}` — groups a schedule's three events. */
function scheduleKey(row: ScheduleRef): string {
  return `${row.contractAddress.toLowerCase()}|${row.member.toLowerCase()}|${row.scheduleIndex}`
}

/**
 * What each stopped schedule still has promised but unminted at the moment it is
 * stopped: its granted award minus everything released up to (and including) the
 * stop — the release the contract emits in the very same `stopVesting` transaction
 * carries the stop's own timestamp, so the vested part it mints is already netted
 * out here and is never reversed twice.
 *
 * A schedule whose `VestingCreated` is absent from the feed (granted before the
 * indexed window) has **no** entry: its grant was never booked, so there is
 * nothing to reverse.
 */
function unvestedRemainders(input: VestingMapperInput): Map<string, bigint> {
  const granted = new Map<string, bigint>()
  for (const row of input.createds ?? []) {
    const key = scheduleKey(row)
    granted.set(key, (granted.get(key) ?? 0n) + BigInt(row.amount))
  }

  const releasesBySchedule = new Map<string, VestingTokensReleasedRow[]>()
  for (const row of input.releases ?? []) {
    const key = scheduleKey(row)
    releasesBySchedule.set(key, [...(releasesBySchedule.get(key) ?? []), row])
  }

  const remainders = new Map<string, bigint>()
  for (const stop of input.stoppeds ?? []) {
    const key = scheduleKey(stop)
    const award = granted.get(key)
    if (award === undefined) continue
    const released = (releasesBySchedule.get(key) ?? [])
      .filter((row) => row.timestamp <= stop.timestamp)
      .reduce((total, row) => total + BigInt(row.amount), 0n)
    const remainder = award - released
    remainders.set(stop.id, remainder > 0n ? remainder : 0n)
  }
  return remainders
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
        debit: 'Deferred SHER Compensation',
        credit: 'SHERS To Be Issued',
        amountUsd: ctx.toUsd(BigInt(row.amount), 'sher', atDate(row.timestamp)),
        token: 'sher',
        rawAmount: row.amount,
        counterparty: row.member,
        shares: shareCount(row.amount),
        memo: 'Vesting grant created — full award promised, none minted yet'
      })
    )
  }

  for (const row of input.releases ?? []) {
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-VEST-02',
        debit: 'SHERS To Be Issued',
        credit: 'Investor Equity',
        amountUsd: ctx.toUsd(BigInt(row.amount), 'sher', atDate(row.timestamp)),
        token: 'sher',
        rawAmount: row.amount,
        counterparty: row.member,
        shares: shareCount(row.amount),
        memo: 'Vested shares released — promised shares issued to equity'
      })
    )
  }

  const remainders = unvestedRemainders(input)
  for (const row of input.stoppeds ?? []) {
    const remainder = remainders.get(row.id) ?? 0n
    // A stop with nothing unvested left (schedule already fully released, or its
    // grant predates the indexed window) has no value to reverse, so it is not a
    // ledger posting at all — the on-chain stop stays visible in the vesting
    // history, but the books only record actual movements.
    if (remainder <= 0n) continue
    entries.push(
      makeEntry({
        id: row.id,
        timestamp: row.timestamp,
        useCase: 'UC-VEST-03',
        debit: 'SHERS To Be Issued',
        credit: 'Deferred SHER Compensation',
        amountUsd: ctx.toUsd(remainder, 'sher', atDate(row.timestamp)),
        token: 'sher',
        rawAmount: remainder.toString(),
        counterparty: row.member,
        shares: shareCount(remainder.toString()),
        memo: 'Vesting stopped — unvested remainder of the grant cancelled'
      })
    )
  }

  return entries
}
