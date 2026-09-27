import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createCreditCallTermsSchema,
  type CreditCallTermsSchemaContext
} from '@/types/communityCredit.schemas'
import {
  createDefaultCreditCallForm,
  creditCallDeadlineContext
} from '@/utils/communityCredit/wizard'

afterEach(() => {
  vi.useRealTimers()
})

function at(iso: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('createDefaultCreditCallForm', () => {
  // The issuer must pick the subscription deadline consciously, so a new form has no
  // date — and therefore can never ship a stale default date either.
  it('leaves the subscription deadline date empty and pre-fills only the time', () => {
    const form = createDefaultCreditCallForm()

    expect(form.deadline).toBe('')
    expect(form.deadlineTime).toBe('23:59')
  })

  it('blocks the Terms step until a deadline date is picked', () => {
    at('2026-08-01T00:00:00Z')

    const form = createDefaultCreditCallForm()
    const context: CreditCallTermsSchemaContext = creditCallDeadlineContext()
    const result = createCreditCallTermsSchema(context).safeParse({
      rate: form.rate,
      deadline: form.deadline,
      deadlineTime: form.deadlineTime,
      period: form.period
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toContain(
      'Subscription deadline is required'
    )
  })
})
