import { describe, expect, it } from 'vitest'
import {
  CREDIT_FIELD_CLASS,
  avatarStyle,
  creditAccessRowClass,
  creditCheckClass,
  creditChipClass,
  creditInitials,
  creditRadioClass,
  formatAmount,
  formatNumber,
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

  describe('statusMeta', () => {
    it('maps every status to a label and badge colour', () => {
      const cases: Record<RoundStatus, { label: string; color: string }> = {
        draft: { label: 'Draft', color: 'neutral' },
        open: { label: 'Open', color: 'primary' },
        funded: { label: 'Funded', color: 'info' },
        active: { label: 'In repayment', color: 'warning' },
        repaid: { label: 'Repaid', color: 'success' }
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
      ['radio', creditRadioClass],
      ['check', creditCheckClass]
    ])('toggles the active branch for the %s style', (_label, fn) => {
      const active = fn(true)
      const inactive = fn(false)
      expect(active.some((c) => c.includes('primary'))).toBe(true)
      expect(active).not.toEqual(inactive)
    })
  })
})
