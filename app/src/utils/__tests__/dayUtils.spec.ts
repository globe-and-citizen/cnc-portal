import { describe, it, expect } from 'vitest'
import {
  getMondayStart,
  getSundayEnd,
  todayMidnight,
  getMonthWeeks,
  differenceInCalendarDays,
  differenceInYears,
  differenceInMonths,
  addYears,
  addMonths,
  addDays,
  format
} from '../dayUtils'

describe('dayUtils', () => {
  describe('getMondayStart', () => {
    it('should return Monday start for a given date', () => {
      const wednesday = new Date('2024-01-17') // Wednesday
      const mondayStart = getMondayStart(wednesday)
      
      expect(mondayStart.getDay()).toBe(1) // Monday
      expect(mondayStart.getHours()).toBe(0)
      expect(mondayStart.getMinutes()).toBe(0)
      expect(mondayStart.getSeconds()).toBe(0)
      expect(mondayStart.getMilliseconds()).toBe(0)
    })

    it('should handle Sunday correctly', () => {
      const sunday = new Date('2024-01-21') // Sunday
      const mondayStart = getMondayStart(sunday)
      
      expect(mondayStart.getDay()).toBe(1) // Monday
      expect(mondayStart.getDate()).toBe(15) // Previous Monday
    })
  })

  describe('getSundayEnd', () => {
    it('should return Sunday end for a given date', () => {
      const wednesday = new Date('2024-01-17') // Wednesday
      const sundayEnd = getSundayEnd(wednesday)
      
      expect(sundayEnd.getDay()).toBe(0) // Sunday
      expect(sundayEnd.getHours()).toBe(23)
      expect(sundayEnd.getMinutes()).toBe(59)
      expect(sundayEnd.getSeconds()).toBe(59)
      expect(sundayEnd.getMilliseconds()).toBe(999)
    })

    it('should handle Sunday correctly', () => {
      const sunday = new Date('2024-01-21') // Sunday
      const sundayEnd = getSundayEnd(sunday)
      
      expect(sundayEnd.getDay()).toBe(0) // Sunday
      expect(sundayEnd.getDate()).toBe(21) // Same Sunday
    })
  })

  describe('todayMidnight', () => {
    it('should return midnight for a given date', () => {
      const someTime = new Date('2024-01-17T15:30:45.123')
      const midnight = todayMidnight(someTime)
      
      expect(midnight.getDate()).toBe(17)
      expect(midnight.getHours()).toBe(0)
      expect(midnight.getMinutes()).toBe(0)
      expect(midnight.getSeconds()).toBe(0)
      expect(midnight.getMilliseconds()).toBe(0)
    })
  })

  describe('getMonthWeeks', () => {
    it('should return array of week start dates for a month', () => {
      const monthDate = new Date('2024-01-15')
      const weeks = getMonthWeeks(monthDate)
      
      expect(Array.isArray(weeks)).toBe(true)
      expect(weeks.length).toBeGreaterThan(0)
      weeks.forEach(week => {
        expect(week).toBeInstanceOf(Date)
      })
    })
  })

  describe('differenceInCalendarDays', () => {
    it('should calculate difference in calendar days', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-05')
      
      expect(differenceInCalendarDays(end, start)).toBe(4)
    })

    it('should handle negative differences', () => {
      const start = new Date('2024-01-05')
      const end = new Date('2024-01-01')
      
      expect(differenceInCalendarDays(end, start)).toBe(-4)
    })

    it('should handle same date', () => {
      const date = new Date('2024-01-01')
      
      expect(differenceInCalendarDays(date, date)).toBe(0)
    })
  })

  describe('differenceInYears', () => {
    it('should calculate complete years difference', () => {
      const start = new Date('2020-01-01')
      const end = new Date('2023-01-01')
      
      expect(differenceInYears(end, start)).toBe(3)
    })

    it('should handle incomplete years', () => {
      const start = new Date('2020-06-15')
      const end = new Date('2023-01-01')
      
      expect(differenceInYears(end, start)).toBe(2)
    })
  })

  describe('differenceInMonths', () => {
    it('should calculate complete months difference', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-06-01')
      
      expect(differenceInMonths(end, start)).toBe(5)
    })

    it('should handle year boundaries', () => {
      const start = new Date('2023-10-01')
      const end = new Date('2024-02-01')
      
      expect(differenceInMonths(end, start)).toBe(4)
    })

    it('should handle incomplete months', () => {
      const start = new Date('2024-01-15')
      const end = new Date('2024-02-10')
      
      expect(differenceInMonths(end, start)).toBe(0)
    })
  })

  describe('addYears', () => {
    it('should add years to a date', () => {
      const date = new Date('2020-01-01')
      const result = addYears(date, 3)
      
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(0)
      expect(result.getDate()).toBe(1)
    })

    it('should handle negative years', () => {
      const date = new Date('2020-01-01')
      const result = addYears(date, -2)
      
      expect(result.getFullYear()).toBe(2018)
    })
  })

  describe('addMonths', () => {
    it('should add months to a date', () => {
      const date = new Date('2024-01-15')
      const result = addMonths(date, 3)
      
      expect(result.getMonth()).toBe(3) // April (0-indexed)
      expect(result.getDate()).toBe(15)
    })

    it('should handle year overflow', () => {
      const date = new Date('2024-10-15')
      const result = addMonths(date, 5)
      
      expect(result.getFullYear()).toBe(2025)
      expect(result.getMonth()).toBe(2) // March (0-indexed)
    })

    it('should handle month overflow for days', () => {
      const date = new Date('2024-01-31')
      const result = addMonths(date, 1)
      
      expect(result.getMonth()).toBe(1) // February
      // Should adjust for February having fewer days
      expect(result.getDate()).toBeLessThanOrEqual(29)
    })
  })

  describe('addDays', () => {
    it('should add days to a date', () => {
      const date = new Date('2024-01-01')
      const result = addDays(date, 10)
      
      expect(result.getDate()).toBe(11)
      expect(result.getMonth()).toBe(0)
    })

    it('should handle month overflow', () => {
      const date = new Date('2024-01-30')
      const result = addDays(date, 5)
      
      expect(result.getMonth()).toBe(1) // February
      expect(result.getDate()).toBe(4)
    })

    it('should handle negative days', () => {
      const date = new Date('2024-01-10')
      const result = addDays(date, -5)
      
      expect(result.getDate()).toBe(5)
    })
  })

  describe('format', () => {
    it('should format date with dd/MM/yyyy pattern', () => {
      const date = new Date('2024-01-05')
      const result = format(date, 'dd/MM/yyyy')
      
      expect(result).toBe('05/01/2024')
    })

    it('should format date with yyyy-MM-dd pattern', () => {
      const date = new Date('2024-12-25')
      const result = format(date, 'yyyy-MM-dd')
      
      expect(result).toBe('2024-12-25')
    })

    it('should pad single digits with zeros', () => {
      const date = new Date('2024-01-05')
      const result = format(date, 'dd-MM-yyyy')
      
      expect(result).toBe('05-01-2024')
    })
  })
})