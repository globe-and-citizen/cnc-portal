import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  CREDIT_FIELD_CLASS,
  applyZodFieldErrors,
  avatarStyle,
  creditAccessRowClass,
  creditChipClass,
  creditInitials,
  creditRadioClass,
  formatAmount,
  formatNumber,
  reachedFundingTarget,
  roundInterest,
  roundTotalDue,
  statusMeta
} from '../communityCreditUtil'
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
