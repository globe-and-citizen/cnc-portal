import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  applyZodFieldErrors,
  avatarStyle,
  creditInitials,
  creditTermLabel,
  formatAmount,
  formatNumber,
  MINUTES_PER_DAY,
  reachedFundingTarget,
  roundInterest,
  roundTotalDue,
  statusMeta
} from '../communityCreditUtil'
import {
  CREDIT_FIELD_CLASS,
  creditAccessRowClass,
  creditChipClass,
  creditRadioClass
} from '../communityCreditWizardUtil'
import type { RoundStatus } from '@/types'

describe('communityCreditUtil', () => {
  describe('formatting', () => {
    it('formats amounts with a token suffix and thousands separators', () => {
      expect(formatAmount(23400)).toBe('23,400 USDC')
      expect(formatAmount(1000, 'POL')).toBe('1,000 POL')
      expect(formatNumber(1234567)).toBe('1,234,567')
      expect(formatNumber(0)).toBe('0')
    })
  })

  describe('creditTermLabel', () => {
    it('shows a plain day count for a preset, regardless of the deadline', () => {
      expect(
        creditTermLabel({
          period: 90 * MINUTES_PER_DAY,
          periodMode: 'preset',
          deadline: '2026-07-31',
          deadlineTime: '23:59'
        })
      ).toBe('90 days')
    })

    it('breaks any custom term down into its real calendar equivalent, whichever unit built it', () => {
      // 2026-07-31 + 90 months = 2034-01-31 exactly (7 years, 6 months, no remainder) —
      // the exact scenario a flat "2741 days (from 90 months)" used to render as.
      const ninetyMonthsMinutes = Math.round(
        (Date.UTC(2034, 0, 31) - Date.UTC(2026, 6, 31)) / 1000 / 60
      )
      expect(
        creditTermLabel({
          period: ninetyMonthsMinutes,
          periodMode: 'custom',
          deadline: '2026-07-31',
          deadlineTime: '00:00'
        })
      ).toBe('7 years, 6 months')

      // Built from "2 weeks" (a days/weeks unit, not months/years) — still broken down,
      // not left as a flat "14 days", since it's still a custom entry.
      expect(
        creditTermLabel({
          period: 14 * MINUTES_PER_DAY,
          periodMode: 'custom',
          deadline: '2026-07-31',
          deadlineTime: '23:59'
        })
      ).toBe('2 weeks')

      // The exact "8000 days" scenario reported live — reads far better as years/
      // months/weeks/days than as a bare four-digit day count.
      expect(
        creditTermLabel({
          period: 8000 * MINUTES_PER_DAY,
          periodMode: 'custom',
          deadline: '2026-07-31',
          deadlineTime: '23:59'
        })
      ).toBe('21 years, 10 months, 3 weeks, 4 days')
    })

    it('includes a remainder-days term when the span is not a round number of months', () => {
      // 2026-01-01 + (6 calendar months + 3 days) worth of minutes → "6 months, 3 days".
      const sixMonthsMinutes = Math.round((Date.UTC(2026, 6, 1) - Date.UTC(2026, 0, 1)) / 1000 / 60)
      expect(
        creditTermLabel({
          period: sixMonthsMinutes + 3 * MINUTES_PER_DAY,
          periodMode: 'custom',
          deadline: '2026-01-01',
          deadlineTime: '00:00'
        })
      ).toBe('6 months, 3 days')
    })

    it('includes hours and minutes for a custom minutes term that is not a whole day', () => {
      // 8000 minutes = 5 days, 13h 20m — the day-only cascade used to silently drop
      // the sub-day remainder and show a flat "5 days", 800 minutes short of reality.
      expect(
        creditTermLabel({
          period: 8000,
          periodMode: 'custom',
          deadline: '2026-07-31',
          deadlineTime: '23:59'
        })
      ).toBe('5 days, 13 hours, 20 minutes')
    })

    it('breaks a wildly-over-cap custom days entry into a readable calendar span', () => {
      // A mistyped "10,000,000 days" is still a valid *number*, but a bare day count
      // doesn't communicate the scale of the mistake nearly as clearly as years does.
      expect(
        creditTermLabel({
          period: 10_000_000 * MINUTES_PER_DAY,
          periodMode: 'custom',
          deadline: '2026-07-31',
          deadlineTime: '23:59'
        })
      ).toBe('27379 years, 3 weeks, 5 days')
    })

    it('falls back to formatCreditPeriod when no deadline is set yet', () => {
      expect(
        creditTermLabel({
          period: 90,
          periodMode: 'custom',
          deadline: '',
          deadlineTime: ''
        })
      ).toBe('2 hours') // formatCreditPeriod(90) rounds 90 minutes up to the nearest hour
    })
  })

  describe('applyZodFieldErrors', () => {
    const schema = z.object({ name: z.string().min(3, 'Too short') })

    it('clears the errors record and returns true on a successful parse', () => {
      const errors: Record<string, string> = { stale: 'leftover from a previous attempt' }
      const result = schema.safeParse({ name: 'Alice' })

      expect(applyZodFieldErrors(result, errors)).toBe(true)
      expect(errors).toEqual({})
    })

    it('populates the errors record by field and returns false on a failed parse', () => {
      const errors: Record<string, string> = {}
      const result = schema.safeParse({ name: 'AB' })

      expect(applyZodFieldErrors(result, errors)).toBe(false)
      expect(errors).toEqual({ name: 'Too short' })
    })

    it('keeps only the first issue per field', () => {
      const multiIssueSchema = z.object({
        name: z.string().min(3, 'Too short').startsWith('Z', 'Must start with Z')
      })
      const errors: Record<string, string> = {}
      const result = multiIssueSchema.safeParse({ name: 'AB' })

      applyZodFieldErrors(result, errors)
      expect(errors.name).toBe('Too short')
    })
  })

  describe('creditInitials', () => {
    it('takes the first letter of the first two name parts', () => {
      expect(creditInitials('Marcel K.')).toBe('MK')
      expect(creditInitials('JR Okoye')).toBe('JO')
    })
    it('handles a single name and the "(you)" suffix', () => {
      expect(creditInitials('You')).toBe('Y')
      expect(creditInitials('Hela E. (you)')).toBe('HE')
    })
  })

  describe('avatarStyle', () => {
    it('builds a 135deg gradient from the two-colour string', () => {
      expect(avatarStyle('#00bf7a,#0f3d2e')).toEqual({
        background: 'linear-gradient(135deg, #00bf7a,#0f3d2e)'
      })
    })
  })

  describe('interest helpers', () => {
    it('computes interest and total due at the fixed rate', () => {
      expect(roundInterest({ raised: 20000, rate: 5 })).toBe(1000)
      expect(roundTotalDue({ raised: 20000, rate: 5 })).toBe(21000)
      expect(roundInterest({ raised: 0, rate: 6 })).toBe(0)
    })
  })

  describe('reachedFundingTarget', () => {
    it('is true once raised meets or exceeds the target', () => {
      expect(reachedFundingTarget({ raised: 1000, target: 1000 })).toBe(true)
      expect(reachedFundingTarget({ raised: 1200, target: 1000 })).toBe(true)
    })

    it('is false for a round accepted via acceptPartialFunding, short of its target', () => {
      // A Funded/Repaying round doesn't always mean the target was actually hit —
      // acceptPartialFunding can move a stalled round straight there with less raised.
      expect(reachedFundingTarget({ raised: 400, target: 1000 })).toBe(false)
    })
  })

  describe('statusMeta', () => {
    it('maps every status to a label and badge colour', () => {
      const cases: Record<RoundStatus, { label: string; color: string }> = {
        open: { label: 'Open', color: 'primary' },
        stalled: { label: 'Action needed', color: 'warning' },
        funded: { label: 'Funded', color: 'info' },
        active: { label: 'In repayment', color: 'warning' },
        overdue: { label: 'Overdue', color: 'error' },
        repaid: { label: 'Repaid', color: 'success' },
        refunded: { label: 'Refunded', color: 'neutral' }
      }
      for (const [status, expected] of Object.entries(cases)) {
        expect(statusMeta(status as RoundStatus)).toEqual(expected)
      }
    })
  })

  describe('form-control styles', () => {
    it('exposes the shared field class', () => {
      expect(CREDIT_FIELD_CLASS).toContain('border-default')
    })

    it.each([
      ['chip', creditChipClass],
      ['access row', creditAccessRowClass],
      ['radio', creditRadioClass]
    ])('toggles the active branch for the %s style', (_label, fn) => {
      const active = fn(true)
      const inactive = fn(false)
      expect(active.some((c) => c.includes('primary'))).toBe(true)
      expect(active).not.toEqual(inactive)
    })
  })
})
