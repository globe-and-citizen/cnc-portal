import type { RoundStatus } from '@/types'

const REPAYABLE_ROUND_STATUSES: readonly RoundStatus[] = ['funded', 'active', 'overdue']

/** Whether FixedReturn accepts a repayment for the round's current lifecycle state. */
export function isRepayableRoundStatus(status: RoundStatus): boolean {
  return REPAYABLE_ROUND_STATUSES.includes(status)
}
