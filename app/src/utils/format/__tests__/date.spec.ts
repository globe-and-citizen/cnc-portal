import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  formatDate,
  formatDateIso,
  formatDateRelative,
  formatDateShort,
  formatDateWeekdayShort,
  formatDateTime,
  formatDateUtc,
  formatDuration,
  formatMonthYear,
  formatTimeOfDay,
  formatWeekdayShort,
  fromUnix
} from '@/utils/format/date'
import { EMPTY_VALUE } from '@/utils/format/shared'

// 2026-01-08T14:05:32Z
const UNIX_SECONDS = 1_767_881_132
const ISO = '2026-01-08T14:05:32.000Z'

describe('fromUnix', () => {
  it('reads on-chain seconds, not milliseconds', () => {
    expect(fromUnix(UNIX_SECONDS).toISOString()).toBe(ISO)
    expect(fromUnix(BigInt(UNIX_SECONDS)).toISOString()).toBe(ISO)
  })
})

describe('date styles', () => {
  it('renders each named style', () => {
    expect(formatDate(ISO)).toBe('Jan 8, 2026')
    expect(formatDateShort(ISO)).toBe('Jan 8')
    expect(formatWeekdayShort(ISO)).toBe('Thu')
    expect(formatDateWeekdayShort(ISO)).toBe('Thu, Jan 8')
    expect(formatMonthYear(ISO)).toBe('January 2026')
    expect(formatDateIso(ISO)).toBe('2026-01-08')
    expect(formatDateUtc(ISO)).toBe('2026-01-08 14:05 UTC')
    expect(formatTimeOfDay(ISO)).toBe('14:05')
  })

  it('keeps the time of day so same-day rows stay ordered', () => {
    expect(formatDateTime(new Date(ISO).getTime())).toContain('Jan 8, 2026')
  })

  it('accepts a Date, a millisecond number and a Dayjs alike', () => {
    expect(formatDate(new Date(ISO))).toBe('Jan 8, 2026')
    expect(formatDate(new Date(ISO).getTime())).toBe('Jan 8, 2026')
    expect(formatDate(fromUnix(UNIX_SECONDS))).toBe('Jan 8, 2026')
  })

  it('renders the empty placeholder for values it cannot display', () => {
    expect(formatDate(null)).toBe(EMPTY_VALUE)
    expect(formatDate(undefined)).toBe(EMPTY_VALUE)
    expect(formatDate('')).toBe(EMPTY_VALUE)
    expect(formatDate('not a date')).toBe(EMPTY_VALUE)
    expect(formatDateUtc('not a date')).toBe(EMPTY_VALUE)
  })
})

describe('formatDateRelative', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (offsetMs: number) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(ISO))
    return new Date(new Date(ISO).getTime() - offsetMs).toISOString()
  }

  it('describes recent instants relatively', () => {
    expect(formatDateRelative(at(5_000))).toBe('just now')
    expect(formatDateRelative(at(3 * 60_000))).toBe('3 min ago')
    expect(formatDateRelative(at(5 * 3_600_000))).toBe('5 h ago')
    expect(formatDateRelative(at(2 * 86_400_000))).toBe('2 d ago')
  })

  it('falls back to an absolute date past a week', () => {
    expect(formatDateRelative(at(10 * 86_400_000))).toBe('Dec 29, 2025')
  })

  it('falls back to an absolute date for the future', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(ISO))
    expect(formatDateRelative('2026-03-01T00:00:00.000Z')).toBe('Mar 1, 2026')
  })
})

describe('formatDuration', () => {
  it('renders elapsed time, never a clock time', () => {
    expect(formatDuration(90)).toBe('1 h 30 min')
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(60 * 24 * 3 + 4 * 60)).toBe('3 d 4 h')
  })

  it('keeps the sign of a negative span', () => {
    expect(formatDuration(-90)).toBe('-1 h 30 min')
  })

  it('renders the empty placeholder for values it cannot display', () => {
    expect(formatDuration(null)).toBe(EMPTY_VALUE)
    expect(formatDuration(NaN)).toBe(EMPTY_VALUE)
  })
})
