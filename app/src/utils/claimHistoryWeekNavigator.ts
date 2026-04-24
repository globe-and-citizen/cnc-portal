import type { WeeklyClaim } from '@/types'
import { formatMinutesAsDuration } from '@/utils/wageUtil'

export const getClaimStatusColor = (weeklyClaim?: WeeklyClaim) => {
  if (!weeklyClaim) return 'accent'
  if (weeklyClaim.status === 'pending') return 'primary'
  if (weeklyClaim.status === 'signed') return 'warning'
  if (weeklyClaim.status === 'withdrawn') return 'info'
  return 'accent'
}

export const formatWeekTooltipText = (
  day: string,
  totalMinutes: number,
  regularMinutes: number,
  overtimeMinutes: number
) => {
  const dayLine = day ? [day] : []

  if (overtimeMinutes > 0) {
    return [
      ...dayLine,
      `Regular: ${formatMinutesAsDuration(regularMinutes)}`,
      `Overtime: ${formatMinutesAsDuration(overtimeMinutes)}`,
      `Total: ${formatMinutesAsDuration(totalMinutes)}`
    ].join('\n')
  }

  return [...dayLine, formatMinutesAsDuration(totalMinutes)].join('\n')
}
