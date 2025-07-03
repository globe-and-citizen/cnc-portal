import dayjs from 'dayjs'

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
 * For a given date, get all the weeks
 *
 * @param monthDate
 * @returns
 */
export function getMonthWeeks(monthDate: Date): Date[] {
  const start = dayjs(monthDate).startOf('month').startOf('week').add(1, 'day')
  const end = dayjs(monthDate).endOf('month').startOf('week')
  const weeks: Date[] = []
  let cursor = start.clone()

  while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
    const week: Date = cursor.toDate()
    cursor = cursor.add(1, 'week')
    weeks.push(week)
  }
  return weeks
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

/**
 * Adds the specified number of years to the given date
 * @param date - The starting date
 * @param years - The number of years to add (can be negative)
 * @returns A new Date object with the years added
 */
export function addYears(date: Date, years: number): Date {
  const newDate = new Date(date)
  newDate.setFullYear(date.getFullYear() + years)
  return newDate
}

export function addMonths(date: Date, months: number): Date {
  const newDate = new Date(date)
  const targetMonth = newDate.getMonth() + months
  const year = newDate.getFullYear() + Math.floor(targetMonth / 12)
  const month = targetMonth % 12

  newDate.setFullYear(year)
  newDate.setMonth(month)

  // Handle month overflow (e.g., Jan 31 + 1 month)
  if (newDate.getMonth() !== month) {
    newDate.setDate(0)
  }

  return newDate
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
