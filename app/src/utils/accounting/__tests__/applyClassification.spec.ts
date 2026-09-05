import { describe, it, expect } from 'vitest'
import { mapBankEvents } from '@/utils/accounting/mappers/bank'
import { mapSafeTransfers } from '@/utils/accounting/mappers/safe'
import type { ClassificationOverride } from '@/utils/accounting/classification'
import { makeCtx, ADDR } from './fixtures'

/** A context whose classifications resolve from a plain `{ id: override }` map. */
function ctxWith(map: Record<string, ClassificationOverride>) {
  return makeCtx({ classificationOf: (id: string) => map[id] })
}

const clientDeposit = {
  id: 'bd1',
  contractAddress: ADDR.bank,
  depositor: ADDR.client,
  token: ADDR.usdcToken,
  amount: '5000000', // 5 USDC
  timestamp: 100
}

describe('applyClassification — source-evidence Bank deposits', () => {
  it('ignores an owner-capital category and keeps direct revenue', () => {
    const [entry] = mapBankEvents(
      { tokenDeposits: [clientDeposit] },
      ctxWith({ bd1: { category: 'OWNER_CAPITAL' } })
    )
    expect(entry).toMatchObject({
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      internal: false,
      useCase: 'UC-BANK-02'
    })
    expect(entry).not.toHaveProperty('classified')
  })

  it('ignores a classification memo and keeps the amount/token intact', () => {
    const [entry] = mapBankEvents(
      { tokenDeposits: [clientDeposit] },
      ctxWith({ bd1: { category: 'OWNER_CAPITAL', memo: 'Bridge from the founder' } })
    )
    expect(entry).toMatchObject({
      debit: 'Cash — Bank',
      credit: 'Service Revenue',
      amountUsd: 5,
      token: 'usdc'
    })
    expect(entry).not.toHaveProperty('classified')
  })

  it('leaves an unclassified deposit on the inferred fallback', () => {
    const [entry] = mapBankEvents({ tokenDeposits: [clientDeposit] }, ctxWith({}))
    expect(entry).toMatchObject({ useCase: 'UC-BANK-02', credit: 'Service Revenue' })
    expect(entry?.classified).toBeUndefined()
  })

  it('ignores an out-only category on a deposit (keeps inference)', () => {
    const [entry] = mapBankEvents(
      { tokenDeposits: [clientDeposit] },
      ctxWith({ bd1: { category: 'EXPENSE' } })
    )
    expect(entry).toMatchObject({ useCase: 'UC-BANK-02', credit: 'Service Revenue' })
    expect(entry?.classified).toBeUndefined()
  })
})

describe('applyClassification — Bank withdrawals', () => {
  const externalOut = {
    id: 'bt1',
    sender: ADDR.bank,
    to: ADDR.client,
    amount: '2000000',
    timestamp: 100
  }

  it('reclassifies an unclassified outflow as an expense and clears the review flag', () => {
    const [entry] = mapBankEvents(
      { tokenTransfers: [{ ...externalOut, token: ADDR.usdcToken }] },
      ctxWith({ bt1: { category: 'EXPENSE' } })
    )
    expect(entry).toMatchObject({
      debit: 'Operating Expense',
      credit: 'Cash — Bank',
      classified: 'EXPENSE',
      useCase: 'CASH-OUT',
      enrichment: 'not-applicable'
    })
  })

  it('books loan interest as Dr Interest Expense', () => {
    const [entry] = mapBankEvents(
      { tokenTransfers: [{ ...externalOut, token: ADDR.usdcToken }] },
      ctxWith({ bt1: { category: 'INTEREST_EXPENSE' } })
    )
    expect(entry).toMatchObject({ debit: 'Interest Expense', credit: 'Cash — Bank' })
  })
})

describe('applyClassification — guaranteed-internal invariant', () => {
  it('refuses to reclassify a pocket-to-pocket move as revenue', () => {
    const [entry] = mapBankEvents(
      {
        deposits: [
          {
            id: 'bd-int',
            contractAddress: ADDR.bank,
            depositor: ADDR.safe,
            amount: '1000000000000000000',
            timestamp: 100
          }
        ]
      },
      ctxWith({ 'bd-int': { category: 'REVENUE' } })
    )
    expect(entry).toMatchObject({
      useCase: 'INTERNAL',
      debit: 'Cash — Bank',
      credit: 'Cash — Safe',
      internal: true
    })
    expect(entry?.classified).toBeUndefined()
  })
})

describe('applyClassification — Safe transfers', () => {
  it('ignores a legacy category on a direct Safe deposit', () => {
    const [entry] = mapSafeTransfers(
      {
        safeAddress: ADDR.safe,
        transfers: [
          {
            id: 'sf1',
            from: ADDR.client,
            to: ADDR.safe,
            token: ADDR.usdcToken,
            amount: '5000000',
            timestamp: 100
          }
        ]
      },
      ctxWith({ sf1: { category: 'OWNER_CAPITAL' } })
    )
    expect(entry).toMatchObject({
      debit: 'Cash — Safe',
      credit: 'Service Revenue'
    })
    expect(entry).not.toHaveProperty('classified')
  })
})
