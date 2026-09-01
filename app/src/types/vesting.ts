import type { ContractFunctionReturnType } from 'viem'
import { vestingAbi } from '@/artifacts/abi/generated'

export const VESTING_TOKEN_DECIMALS = 6

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

/** ABI-derived result of `getVestingsWithMembers` and `getAllArchivedVestingsFlat`. */
export type VestingTuple = ContractFunctionReturnType<
  typeof vestingAbi,
  'view',
  'getVestingsWithMembers'
>

/** ABI-derived `VestingInfo` struct returned in a Vesting tuple. */
export type VestingInfo = VestingTuple[2][number]

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
