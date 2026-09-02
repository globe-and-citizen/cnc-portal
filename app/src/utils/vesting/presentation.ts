import {
  VESTING_TOKEN_DECIMALS,
  type VestingSchedule,
  type VestingScheduleState
} from '@/types/vesting'
import { formatPercent, formatTokenUnits, fromUnix } from '@/utils/format'
import { formatVestingBoundary } from '@/utils/vesting/schedule'

type BadgeColor = 'neutral' | 'warning' | 'success' | 'info' | 'error'

const STATE_METADATA: Record<
  VestingScheduleState,
  { label: string; description: string; color: BadgeColor }
> = {
  upcoming: { label: 'Upcoming', description: 'Accrual has not started', color: 'neutral' },
  cliff_locked: {
    label: 'Cliff locked',
    description: 'Accruing but not claimable',
    color: 'warning'
  },
  accruing: { label: 'Accruing', description: 'The next release is building', color: 'info' },
  claimable: { label: 'Claimable', description: 'Shares are available now', color: 'success' },
  fully_vested: { label: 'Fully vested', description: 'The full grant has accrued', color: 'info' },
  completed: { label: 'Completed', description: 'The full grant was released', color: 'success' },
  cancelled: { label: 'Cancelled', description: 'Future accrual was stopped', color: 'error' }
}

export const getVestingStateMeta = (state: VestingScheduleState) => STATE_METADATA[state]

export const formatVestingAmount = (value: bigint, tokenSymbol: string) =>
  formatTokenUnits(value, VESTING_TOKEN_DECIMALS, tokenSymbol, { maxDecimals: 6 })

export const formatVestingProgress = (progress: number) =>
  formatPercent(Math.min(progress, 100) / 100, { decimals: 0 })

export function getVestingNextStep(schedule: VestingSchedule): string {
  if (schedule.state === 'upcoming') {
    return `Starts ${formatVestingBoundary(fromUnix(schedule.start).toDate())}`
  }
  if (schedule.state === 'cliff_locked') {
    return `Cliff ends ${formatVestingBoundary(fromUnix(schedule.cliffEnd).toDate())}`
  }
  if (schedule.state === 'claimable') return 'Ready to release'
  if (schedule.state === 'accruing') return 'Shares continue accruing'
  if (schedule.state === 'fully_vested') return 'Release remaining shares'
  if (schedule.state === 'completed') return 'No action needed'
  return 'Schedule closed'
}
