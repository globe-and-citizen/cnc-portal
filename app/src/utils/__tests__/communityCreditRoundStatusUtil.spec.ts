import { describe, expect, it } from 'vitest'
import { isRepayableRoundStatus } from '../communityCreditRoundStatusUtil'

describe('isRepayableRoundStatus', () => {
  it('allows repayments only after the funding lifecycle has progressed', () => {
    expect(isRepayableRoundStatus('funded')).toBe(true)
    expect(isRepayableRoundStatus('active')).toBe(true)
    expect(isRepayableRoundStatus('overdue')).toBe(true)
    expect(isRepayableRoundStatus('open')).toBe(false)
    expect(isRepayableRoundStatus('stalled')).toBe(false)
  })
})
