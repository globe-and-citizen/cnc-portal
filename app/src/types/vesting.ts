/**
 * A single vesting schedule flattened for table display.
 * `released` is the amount already minted to the member (shares only exist once
 * released — vesting mints on demand rather than locking pre-funded tokens).
 */
export interface VestingRow {
  member: string
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

export type VestingTuple = [string[], VestingInfo[]]

export type VestingStatus = 'all' | 'active' | 'completed' | 'cancelled'
