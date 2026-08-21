/**
 * A single vesting schedule flattened for table display.
 * `index` is the schedule's position in the member's on-chain `vestings` array —
 * a member can hold several — and is what `release` / `stopVesting` target.
 * `released` is the amount already minted to the member (shares only exist once
 * released — vesting mints on demand rather than locking pre-funded tokens).
 */
export interface VestingRow {
  member: string
  index: number
  startDate: string
  durationDays: number
  cliffDays: number
  totalAmount: number
  tokenSymbol: string
  released: number
  status: 'Active' | 'Inactive' | 'Completed'
  isStarted?: boolean
}

/**
 * Per-token aggregate shown in the stats card.
 * `totalPromised` sums the agreed amounts; `totalReleased` sums what has been
 * minted. There is no "withdrawn" total — unvested amounts are never minted.
 */
export interface TokenSummary {
  symbol: string
  totalPromised: number
  totalReleased: number
}

export const VESTING_TOKEN_DECIMALS = 6

/** On-chain `VestingInfo` struct as returned by the Vesting contract. */
export interface VestingInfo {
  start: bigint | number
  duration: bigint | number
  cliff: bigint | number
  totalAmount: bigint
  released: bigint
  active: boolean
}

export interface VestingCreation {
  member: {
    name: string
    address: string
  }
  totalAmount: string
  tokenSymbol: string
  startAt: Date
  endAt: Date
  cliffEndAt: Date
  durationMinutes: number
  cliffMinutes: number
  noCliff: boolean
}

// Contract reads return three parallel arrays: members, their schedule indices,
// and the schedules themselves (a member appears once per schedule).
export type VestingTuple = [string[], bigint[], VestingInfo[]]

export type VestingScheduleState =
  | 'upcoming'
  | 'cliff_locked'
  | 'accruing'
  | 'claimable'
  | 'fully_vested'
  | 'completed'
  | 'cancelled'

export interface VestingSchedule {
  member: string
  index: bigint
  start: number
  end: number
  cliffEnd: number
  totalAmount: bigint
  vestedAmount: bigint
  claimableAmount: bigint
  releasedAmount: bigint
  unvestedAmount: bigint
  active: boolean
  progress: number
  state: VestingScheduleState
}

export interface VestingTotals {
  promised: bigint
  vested: bigint
  claimable: bigint
  released: bigint
}

export type VestingStatus = 'all' | 'active' | 'claimable' | 'completed' | 'cancelled'
