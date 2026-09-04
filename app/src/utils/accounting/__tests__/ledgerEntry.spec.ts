import { describe, expect, it } from 'vitest'
import {
  makeEntry,
  normalizeCounterparty,
  sourceOperationIdOf,
  transactionHashOf
} from '@/utils/accounting/ledgerEntry'

const TX_HASH = `0x${'a'.repeat(64)}`

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
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
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
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      amountUsd: 1,
      token: 'native',
      rawAmount: '1',
      memo: 'x',
      counterparty: 'bad'
    })

    expect(entry.counterparty).toBeUndefined()
  })
})

describe('transaction-backed ledger entry identity', () => {
  it('derives the transaction hash and operation identity from an indexed event id', () => {
    const entry = makeEntry({
      id: `${TX_HASH}-17`,
      timestamp: 100,
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      amountUsd: 10,
      token: 'usdc',
      rawAmount: '10000000',
      memo: 'Client payment'
    })

    expect(entry).toMatchObject({ sourceOperationId: TX_HASH, txHash: TX_HASH })
  })

  it('keeps a synthetic operation identity intact', () => {
    expect(transactionHashOf('credit-interest-1-lender')).toBeUndefined()
    expect(sourceOperationIdOf('credit-interest-1-lender')).toBe('credit-interest-1-lender')
  })
})
