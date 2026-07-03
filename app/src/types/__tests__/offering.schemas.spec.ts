import { describe, expect, it } from 'vitest'
import {
  createApplyOfferingAmountSchema,
  createOfferingAccessSchema,
  createOfferingTermsSchema,
  createRepayAmountSchema,
  offeringBasicsSchema
} from '../offering.schemas'

describe('offering schemas', () => {
  it('validates the basic offering fields', () => {
    expect(offeringBasicsSchema.safeParse({ title: 'AB', principal: 0, rate: 101 }).success).toBe(
      false
    )
  })

  it('validates term dates, maximums, and lender caps from context', () => {
    const schema = createOfferingTermsSchema({
      today: '2030-01-01',
      termUnit: 'months',
      maxTerm: 120,
      capOn: true,
      principal: 1000
    })

    const result = schema.safeParse({
      deadline: '2030-02-02',
      termValue: 121,
      cap: 1001
    })

    expect(result.success).toBe(false)
  })

  it('validates whitelist allocations against required amounts, cap, and target', () => {
    const schema = createOfferingAccessSchema({ cap: 500, principal: 800 })
    const result = schema.safeParse({
      access: 'whitelist',
      whitelist: [
        { username: 'A', address: '0x1', amount: 500 },
        { username: 'B', address: '0x2', amount: 500 }
      ]
    })

    expect(result.success).toBe(false)
  })

  it('validates a positive apply amount against the remaining allocation', () => {
    const schema = createApplyOfferingAmountSchema(100, 'USDC')

    expect(schema.safeParse({ amount: 0 }).success).toBe(false)
    const overLimit = schema.safeParse({ amount: 101 })
    expect(overLimit.success).toBe(false)
    if (!overLimit.success) {
      expect(overLimit.error.issues[0]?.message).toBe('Maximum loan amount is 100 USDC.')
    }
    expect(schema.safeParse({ amount: 100 }).success).toBe(true)
  })

  it('validates repayment amounts against the outstanding balance', () => {
    const schema = createRepayAmountSchema({ outstanding: 50.5, treasuryBalance: Infinity, tokenSymbol: 'USDC' })

    expect(schema.safeParse({ amount: 0 }).success).toBe(false)
    expect(schema.safeParse({ amount: 50.5 }).success).toBe(true)

    const overLimit = schema.safeParse({ amount: 51 })
    expect(overLimit.success).toBe(false)
    if (!overLimit.success) {
      expect(overLimit.error.issues[0]?.message).toContain('50.5 USDC')
    }
  })

  it('rejects an amount that exceeds the treasury balance with a treasury-cap message', () => {
    // outstanding=100, treasuryBalance=30 → entering 50 hits treasury cap only
    const schema = createRepayAmountSchema({ outstanding: 100, treasuryBalance: 30, tokenSymbol: 'USDC' })

    const result = schema.safeParse({ amount: 50 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('treasury balance')
      expect(result.error.issues[0]?.message).toContain('30')
    }
  })

  it('rejects an amount that exceeds the outstanding balance with an outstanding message', () => {
    // outstanding=20, treasuryBalance=100 → entering 30 hits outstanding cap only
    const schema = createRepayAmountSchema({ outstanding: 20, treasuryBalance: 100, tokenSymbol: 'USDC' })

    const result = schema.safeParse({ amount: 30 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('outstanding balance')
      expect(result.error.issues[0]?.message).toContain('20')
    }
  })

  it('accepts an amount within both outstanding and treasury limits', () => {
    const schema = createRepayAmountSchema({ outstanding: 100, treasuryBalance: 80, tokenSymbol: 'USDC' })
    expect(schema.safeParse({ amount: 50 }).success).toBe(true)
  })
})
