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

/** On-chain `VestingInfo` struct as returned by the Vesting contract. */
export interface VestingInfo {
  start: number
  duration: number
  cliff: number
  totalAmount: bigint
  released: bigint
  active: boolean
}

export interface VestingCreation {
  member: {
    name: string
    address: string
  }
  totalAmount: number
  startDate: Date
  duration: {
    years: number
    months: number
    days: number
  }
  durationInDays: number
  cliff: number
}

// Contract reads return three parallel arrays: members, their schedule indices,
// and the schedules themselves (a member appears once per schedule).
export type VestingTuple = [string[], bigint[], VestingInfo[]]

export type VestingStatus = 'all' | 'active' | 'completed' | 'cancelled'
