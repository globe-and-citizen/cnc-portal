import { describe, expect, it } from 'vitest'
import { combineDayAndTime } from '@/utils/dayUtils'

describe('combineDayAndTime', () => {
  const day = new Date(2026, 7, 17) // Aug 17, 2026, local midnight

  it('puts the picked day and the typed hour back together', () => {
    const combined = combineDayAndTime(day, '18:00')

    expect(combined?.getFullYear()).toBe(2026)
    expect(combined?.getMonth()).toBe(7)
    expect(combined?.getDate()).toBe(17)
    expect(combined?.getHours()).toBe(18)
    expect(combined?.getMinutes()).toBe(0)
    expect(combined?.getSeconds()).toBe(0)
  })

  it('accepts a single-digit hour and ignores surrounding spaces', () => {
    expect(combineDayAndTime(day, ' 9:05 ')?.getHours()).toBe(9)
    expect(combineDayAndTime(day, ' 9:05 ')?.getMinutes()).toBe(5)
  })

  it('leaves the day it was given untouched', () => {
    combineDayAndTime(day, '18:00')

    expect(day.getHours()).toBe(0)
  })

  it('returns null rather than guessing an hour it cannot read', () => {
    expect(combineDayAndTime(day, '')).toBeNull()
    expect(combineDayAndTime(day, 'noon')).toBeNull()
    expect(combineDayAndTime(day, '24:00')).toBeNull()
    expect(combineDayAndTime(day, '18:75')).toBeNull()
  })
})
