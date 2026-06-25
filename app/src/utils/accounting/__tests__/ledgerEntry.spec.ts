import { describe, it, expect } from 'vitest'
import { makeEntry, normalizeCounterparty } from '@/utils/accounting/ledgerEntry'

describe('normalizeCounterparty', () => {
  it('checksum-normalizes a valid address', () => {
    expect(normalizeCounterparty('0x6666666666666666666666666666666666666666')).toBe(
      '0x6666666666666666666666666666666666666666'
    )
  })

  it('returns undefined for invalid / missing input', () => {
    expect(normalizeCounterparty(null)).toBeUndefined()
    expect(normalizeCounterparty(undefined)).toBeUndefined()
    expect(normalizeCounterparty('not-an-address')).toBeUndefined()
  })
})

describe('makeEntry', () => {
  it('fills the common defaults (internal=false, enrichment=not-applicable)', () => {
    const entry = makeEntry({
      id: '1',
      timestamp: 1,
      useCase: 'UC-BANK-01',
      debit: 'Cash — Bank',
      credit: 'Owner Capital',
      amountUsd: 1,
      token: 'native',
      rawAmount: '1',
      memo: 'x'
    })
    expect(entry.internal).toBe(false)
    expect(entry.enrichment).toBe('not-applicable')
    expect(entry.counterparty).toBeUndefined()
  })

  it('drops an invalid counterparty rather than storing it', () => {
    const entry = makeEntry({
      id: '1',
      timestamp: 1,
      useCase: 'UC-BANK-01',
      debit: 'Cash — Bank',
      credit: 'Owner Capital',
      amountUsd: 1,
      token: 'native',
      rawAmount: '1',
      memo: 'x',
      counterparty: 'bad'
    })
    expect(entry.counterparty).toBeUndefined()
  })
})
