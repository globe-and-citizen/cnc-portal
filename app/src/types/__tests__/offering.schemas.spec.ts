import { describe, expect, it } from 'vitest'
import {
  createApplyOfferingAmountSchema,
  createOfferingAccessSchema,
  createOfferingTermsSchema,
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
      startDate: '2030-02-01',
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
})
