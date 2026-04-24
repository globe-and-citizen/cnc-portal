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
  totalMin: number,
  regularMin: number,
  overtimeMin: number
) => {
  const dayLine = day ? [day] : []

  if (overtimeMin > 0) {
    return [
      ...dayLine,
      `Regular: ${formatMinutesAsDuration(regularMin)}`,
      `Overtime: ${formatMinutesAsDuration(overtimeMin)}`,
      `Total: ${formatMinutesAsDuration(totalMin)}`
    ].join('\n')
  }

  return [...dayLine, formatMinutesAsDuration(totalMin)].join('\n')
}