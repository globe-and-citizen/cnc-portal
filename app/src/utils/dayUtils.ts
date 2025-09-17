import dayjs from 'dayjs'

import utc from 'dayjs/plugin/utc'
import isoWeek from 'dayjs/plugin/isoWeek'
import weekday from 'dayjs/plugin/weekday'

dayjs.extend(utc)
dayjs.extend(isoWeek)
dayjs.extend(weekday)

export interface Week {
  month: number // The month (0-11)
  year: number // The year
  isoWeek: number // The ISO week number (1-53)
  isoString: string // ISO string of the Monday of that week (e.g. "2023-01-02T00:00:00.000Z")
  formatted: string // Formatted string like "Jan 01 - Jan 07"
}

export function getMondayStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const diff = day === 0 ? -6 : 1 - day // Si dimanche, recule de 6 jours, sinon ajuste
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0) // Met à 00:00:00.000
  return d
}

export function getSundayEnd(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0 = dimanche, 1 = lundi, ..., 6 = samedi
  const diff = day === 0 ? 0 : 7 - day // Si dimanche, reste le même jour, sinon ajuste
  d.setDate(d.getDate() + diff)
  d.setHours(23, 59, 59, 999) // Met à 23:59:59.999
  return d
}

export function todayMidnight(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0) // Met à 00:00:00.000
  return d
}

/**
 * Get all ISO weeks of a month as Week objects
 * @param year - e.g. 2025
 * @param month - 0 = January, 11 = December
 * @returns Array of Week for each ISO week in the month
 */
export function getMonthWeeks(year: number, month: number): Week[] {
  const start = dayjs.utc().year(year).month(month).startOf('month')

  const end = start.endOf('month')
  const seen = new Set<string>()
  const result: Week[] = []
  let current = start.startOf('isoWeek') // Monday as start of week
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    const week = current.isoWeek()
    const weekYear = current.isoWeekYear()
    const key = `${weekYear}-${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({
        year: weekYear,
        month: current.month(),
        isoWeek: week,
        isoString: current.toISOString(),
        formatted: formatIsoWeekRange(current)
      })
    }
    current = current.add(1, 'week')
  }
  return result
}

/**
 * Format helpers (UTC-safe)
 */
export function formatMonthYear(year: number, month: number): string {
  try {
    return dayjs.utc().year(year).month(month).format('MMMM YYYY')
  } catch (error) {
    console.error('Error formatting month/year:', error)
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }
}

/**
 * Format an ISO week range (Monday to Sunday) from a given dayjs date
 * @param base - A dayjs date within the desired week
 * @returns A string representing the week range, e.g. "Jan 01 - Jan 07"
 */
export function formatIsoWeekRange(base: dayjs.Dayjs): string {
  try {
    const start = base.startOf('isoWeek')
    const end = base.endOf('isoWeek')
    return `${start.format('MMM DD')} - ${end.format('MMM DD')}`
  } catch (error) {
    console.error('Error formatting ISO week range:', error)
    return `${base.format('YYYY-MM-DD')} - ${base.add(6, 'day').format('YYYY-MM-DD')}`
  }
}

/* Calculates the number of calendar days between two dates.
 * The calculation is done in UTC to avoid daylight saving time issues.
 *
 * @param endDate - The later date to compare
 * @param startDate - The earlier date to compare
 * @returns The number of calendar days between the two dates (rounded down)
 *
 * @example
 * const start = new Date('2023-01-01');
 * const end = new Date('2023-01-05');
 * differenceInCalendarDays(end, start); // Returns 4
 */
export function differenceInCalendarDays(endDate: Date, startDate: Date): number {
  const utc1 = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
  const utc2 = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
  return Math.floor((utc1 - utc2) / (1000 * 60 * 60 * 24))
}

/**
 * Calculates the difference in years between two dates, accounting for incomplete years
 *
 * @param endDate - The later date to compare
 * @param startDate - The earlier date to compare
 * @returns The number of complete years between the two dates
 *
 * @example
 * const years = differenceInYears(new Date('2023-01-01'), new Date('2020-01-01'))
 * console.log(years) // 3
 *
 * @example
 * // Handles incomplete years
 * const years = differenceInYears(new Date('2023-01-01'), new Date('2020-06-15'))
 * console.log(years) // 2
 */
export function differenceInYears(endDate: Date, startDate: Date): number {
  let years = endDate.getFullYear() - startDate.getFullYear()
  const monthDiff = endDate.getMonth() - startDate.getMonth()
  const dayDiff = endDate.getDate() - startDate.getDate()

  // Adjust for incomplete years
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    years--
  }
  return years
}

/**
 * Calculates the number of months between two dates.
 *
 * @param endDate - The later date to compare
 * @param startDate - The earlier date to compare
 * @returns The number of complete months between the two dates
 *- The calculation includes both the year and month differences
 */
export function differenceInMonths(endDate: Date, startDate: Date): number {
  let months = (endDate.getFullYear() - startDate.getFullYear()) * 12
  months += endDate.getMonth() - startDate.getMonth()

  // Adjust for incomplete months
  if (endDate.getDate() < startDate.getDate()) {
    months--
  }
  return months
}


export function addDays(date: Date, days: number): Date {
  const newDate = new Date(date)
  newDate.setDate(date.getDate() + days)
  return newDate
}

export function format(date: Date, formatStr: string): string {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()

  return formatStr.replace('dd', day).replace('MM', month).replace('yyyy', year.toString())
}
