import { describe, expect, it } from 'vitest'
import { accountingCompletenessOf } from '../accountingCompleteness'
import type { AccountingSourceStatus } from '../types'

const source = (
  state: AccountingSourceStatus['state'],
  name: AccountingSourceStatus['source'] = 'company'
): AccountingSourceStatus => ({ source: name, label: name, state })

describe('accountingCompletenessOf', () => {
  it('is ready when every applicable source is ready', () => {
    expect(accountingCompletenessOf([source('ready'), source('not-applicable')])).toBe('ready')
  })

  it('keeps reports loading while any applicable source is pending', () => {
    expect(accountingCompletenessOf([source('ready'), source('loading', 'weekly-claims')])).toBe(
      'loading'
    )
  })

  it('marks books partial when evidence is unavailable', () => {
    expect(accountingCompletenessOf([source('ready'), source('partial', 'bank-events')])).toBe(
      'partial'
    )
  })

  it('gives a fatal source failure precedence over loading and partial states', () => {
    expect(
      accountingCompletenessOf([
        source('loading', 'weekly-claims'),
        source('partial', 'bank-events'),
        source('failed')
      ])
    ).toBe('failed')
  })
})
