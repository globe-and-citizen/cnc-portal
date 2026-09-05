import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import {
  dateToCalendarDate,
  differenceInCalendarDays,
  differenceInMonths,
  differenceInYears,
  ensureFutureDate,
  format,
  formatDateMMDDYYYY,
  formatDateRelative,
  formatDateShort,
  formatDateUTC,
  formatIsoWeekRange,
  formatMonthYear,
  getMonthWeeks,
  startOfWeek
} from '@/utils/dates/calendar'

dayjs.extend(utc)

describe('ISO weeks', () => {
  it('lists every week a month touches, once, starting on the Monday', () => {
    const weeks = getMonthWeeks(2025, 0)
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toMatchObject({
      year: 2025,
      isoWeek: 1,
      isoString: '2024-12-30T00:00:00.000Z',
      formatted: 'Dec 30 - Jan 5'
    })
    expect(weeks[4].isoWeek).toBe(5)
    const keys = weeks.map((week) => `${week.year}-${week.isoWeek}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('formats a week as its Monday-to-Sunday range', () => {
    expect(formatIsoWeekRange(dayjs.utc('2025-01-01'))).toBe('Dec 30 - Jan 5')
  })

  it('resolves the Monday of the week a date falls in', () => {
    expect(startOfWeek('2025-01-01').toISOString()).toBe('2024-12-30T00:00:00.000Z')
    expect(startOfWeek(new Date('2025-01-05T23:00:00.000Z')).toISOString()).toBe(
      '2024-12-30T00:00:00.000Z'
    )
  })

  it('labels a month and year from its numeric parts', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-15T12:00:00.000Z'))
    expect(formatMonthYear(2025, 0)).toBe('January 2025')
    vi.useRealTimers()
  })
})

describe('date arithmetic', () => {
  it('counts whole calendar days, in either direction', () => {
    expect(differenceInCalendarDays(new Date('2023-01-05'), new Date('2023-01-01'))).toBe(4)
    expect(differenceInCalendarDays(new Date('2023-01-01'), new Date('2023-01-05'))).toBe(-4)
  })

  it('counts only complete years', () => {
    expect(differenceInYears(new Date('2023-01-01'), new Date('2020-01-01'))).toBe(3)
    expect(differenceInYears(new Date('2023-01-01'), new Date('2020-06-15'))).toBe(2)
    expect(differenceInYears(new Date('2023-01-10'), new Date('2020-01-20'))).toBe(2)
  })

  it('counts only complete months', () => {
    expect(differenceInMonths(new Date('2023-03-15'), new Date('2023-01-15'))).toBe(2)
    expect(differenceInMonths(new Date('2023-03-10'), new Date('2023-01-15'))).toBe(1)
    expect(differenceInMonths(new Date('2024-01-15'), new Date('2023-01-15'))).toBe(12)
  })
})

describe('date conversion', () => {
  const day = new Date('2025-06-09T10:00:00.000Z')

  it('converts a Date to a CalendarDate with a 1-based month', () => {
    expect(dateToCalendarDate(day)).toMatchObject({ year: 2025, month: 6, day: 9 })
  })

  it('pads the parts of a formatted day', () => {
    expect(formatDateMMDDYYYY(day)).toBe('06/09/2025')
    expect(format(day, 'dd/MM/yyyy')).toBe('09/06/2025')
  })
})

describe('ensureFutureDate', () => {
  const minDate = new Date('2026-01-10T00:00:00.000Z')

  it('keeps a date that is already past the minimum', () => {
    const selected = new Date('2026-02-01T00:00:00.000Z')
    expect(ensureFutureDate(selected, minDate)).toBe(selected)
  })

  it('falls back to a copy of the minimum when the pick is too early', () => {
    const corrected = ensureFutureDate(new Date('2025-12-01T00:00:00.000Z'), minDate)
    expect(corrected.toISOString()).toBe(minDate.toISOString())
    expect(corrected).not.toBe(minDate)
  })
})

describe('display helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-08T14:10:32.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('shows the full timestamp, the relative label and the UTC instant', () => {
    expect(formatDateShort('2026-01-08T14:05:32.000Z')).toBe('Jan 8, 2026, 14:05:32')
    expect(formatDateRelative('2026-01-08T14:05:32.000Z')).toBe('5 min ago')
    expect(formatDateUTC('2026-01-08T14:05:32.000Z')).toBe('2026-01-08 14:05 UTC')
  })
})
