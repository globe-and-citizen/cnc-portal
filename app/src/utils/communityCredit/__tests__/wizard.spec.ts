import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCreditCallTermsSchema,
  type CreditCallTermsSchemaContext
} from '@/types/communityCredit.schemas'
import {
  createDefaultCreditCallForm,
  creditCallDeadlineContext,
  DEFAULT_CREDIT_DEADLINE_DAYS
} from '@/utils/communityCredit/wizard'

afterEach(() => {
  vi.useRealTimers()
})

function at(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('createDefaultCreditCallForm', () => {
  // Regression guard: the default deadline used to be the hard-coded `2026-07-31`,
  // so from 2026-08-01 every issuer opening the wizard got a deadline already in the
  // past and could not publish. A date-independent assertion is the point here — any
  // fixed expectation would re-arm the same trap.
  it.each([
    ['2026-08-01T00:00:00Z', 'the day the old hard-coded default expired'],
    ['2030-01-15T12:00:00Z', 'far in the future'],
    ['2026-12-31T23:59:00Z', 'across a year boundary']
  ])('pre-fills a deadline that passes validation at %s (%s)', (iso) => {
    at(iso)

    const form = createDefaultCreditCallForm()
    const context: CreditCallTermsSchemaContext = creditCallDeadlineContext()
    const result = createCreditCallTermsSchema(context).safeParse({
      rate: form.rate,
      deadline: form.deadline,
      deadlineTime: form.deadlineTime,
      period: form.period
    })

    expect(result.success).toBe(true)
  })

  it(`sets the deadline ${DEFAULT_CREDIT_DEADLINE_DAYS} days out`, () => {
    at('2026-08-01T00:00:00Z')

    const expected = new Date(
      Date.UTC(2026, 7, 1) + DEFAULT_CREDIT_DEADLINE_DAYS * 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10)

    expect(createDefaultCreditCallForm().deadline).toBe(expected)
  })
})
