import { describe, expect, it } from 'vitest'
import { formatInboxDate, formatInboxDateTime } from '../app/utils/format/date'
import { subtractDate } from '../server/utils/subtractDate'

describe('inbox dates', () => {
  it('preserves the inbox time and day-first date displays', () => {
    const now = new Date(2026, 4, 15, 13, 45)
    expect(formatInboxDate(new Date(2026, 4, 15, 9, 7), now)).toBe('09:07')
    expect(formatInboxDate(new Date(2026, 4, 4, 9, 7), now)).toBe('04 May')
    expect(formatInboxDateTime(new Date(2026, 4, 4, 9, 7))).toBe('04 May 09:07')
  })

  it('subtracts months before days with month-end clamping', () => {
    expect(subtractDate(new Date(2026, 2, 31, 12), { months: 1, days: 4 })).toEqual(new Date(2026, 1, 24, 12))
  })
})
