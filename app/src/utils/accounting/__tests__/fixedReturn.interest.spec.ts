/**
 * The fixed return a Community Credit round owes — recognised the moment the
 * round funds, cleared as the lenders are paid. Split from `fixedReturn.spec.ts`
 * (which covers the lifecycle mapping itself) so each file stays readable.
 */
import { describe, it, expect } from 'vitest'
import { mapFixedReturnEvents } from '@/utils/accounting/mappers/fixedReturn'
import { makeCtx, ADDR, creditOffer, creditEvent, balanceOf, totalDebited } from './fixtures'

const ctx = makeCtx()
const offer = creditOffer
const lent = creditEvent
const repaid = creditEvent

describe('the fixed return owed', () => {
  const jan1 = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000)
  const apr1 = Math.floor(Date.parse('2026-04-01T00:00:00Z') / 1000)

  /** 100 USDC raised on Jan 1, 12% flat, due Apr 1 — 12 USDC of fixed return. */
  const round = (over: Record<string, unknown> = {}) => ({
    lendingOfferCreateds: [offer('1', jan1 - 100)],
    fundsLents: [lent('fl1', '100000000', jan1)],
    lendingOfferFundeds: [
      { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: jan1 }
    ],
    offerTerms: [{ offerId: '1', interestRateBps: 1200 }],
    ...over
  })

  it('books the whole fee when the round funds, in one posting', () => {
    const entries = mapFixedReturnEvents(round(), ctx)
    const owed = entries.filter((e) => e.useCase === 'UC-CREDIT-05')
    expect(owed).toHaveLength(1)
    expect(owed[0]).toMatchObject({
      // Stable id: the round and the lender, so the row never changes identity.
      id: `credit-interest-1-${ADDR.lender}`,
      debit: 'Interest Expense',
      credit: 'Interest Payable',
      amountUsd: 12,
      token: 'usdc',
      // Dated the day the round closed, not the day it matures.
      timestamp: jan1,
      internal: false
    })
    expect(owed[0]?.counterparty?.toLowerCase()).toBe(ADDR.lender)
  })

  it('names each lender on their own share of the fee', () => {
    // 60 / 40 split of a 100 USDC round at 12% — 7.20 and 4.80 of fixed return.
    const entries = mapFixedReturnEvents(
      round({
        fundsLents: [lent('fl1', '60000000', jan1), lent('fl2', '40000000', jan1, ADDR.client)]
      }),
      ctx
    )
    const owed = entries.filter((e) => e.useCase === 'UC-CREDIT-05')
    expect(owed.map((e) => [e.counterparty?.toLowerCase(), e.amountUsd])).toEqual([
      [ADDR.lender, 7.2],
      [ADDR.client, 4.8]
    ])
    // The shares foot to the flat fee exactly — the last lender absorbs any
    // rounding remainder, as `totalEntitlementOf` does on-chain.
    expect(owed.reduce((sum, e) => sum + e.amountUsd, 0)).toBeCloseTo(12, 6)
  })

  it('clears each lender against their own share, not the round total', () => {
    const entries = mapFixedReturnEvents(
      round({
        fundsLents: [lent('fl1', '60000000', jan1), lent('fl2', '40000000', jan1, ADDR.client)],
        // Only the first lender is made whole: 60 principal + 7.20 interest.
        lenderRepaids: [repaid('rp1', '67200000', apr1)]
      }),
      ctx
    )
    const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(paid.map((e) => [e.debit, e.amountUsd])).toEqual([
      ['Loan Payable', 60],
      ['Interest Payable', 7.2]
    ])
    // The second lender is still owed their principal and their share of the fee.
    expect(balanceOf(entries, 'Loan Payable')).toBeCloseTo(40, 6)
    expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(4.8, 6)
  })

  it('shows the full debt — principal and fee — from the day the round funds', () => {
    const entries = mapFixedReturnEvents(round(), ctx)
    expect(balanceOf(entries, 'Loan Payable')).toBeCloseTo(100, 6)
    expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(12, 6)
  })

  it('is the same figure however late the books are read', () => {
    const early = mapFixedReturnEvents(round(), ctx).filter((e) => e.useCase === 'UC-CREDIT-05')
    const late = mapFixedReturnEvents(round(), ctx).filter((e) => e.useCase === 'UC-CREDIT-05')
    expect(late).toEqual(early)
  })

  it('settles against Interest Payable rather than a fresh expense', () => {
    const entries = mapFixedReturnEvents(
      round({ lenderRepaids: [repaid('rp1', '112000000', apr1)] }),
      ctx
    )
    const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(paid.map((e) => [e.debit, e.amountUsd])).toEqual([
      ['Loan Payable', 100],
      ['Interest Payable', 12]
    ])
    // Both liabilities are cleared, and the cost was booked exactly once.
    expect(balanceOf(entries, 'Loan Payable')).toBeCloseTo(0, 6)
    expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(0, 6)
    expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
  })

  it('carries what the round still owes after each installment', () => {
    const entries = mapFixedReturnEvents(
      round({
        // 112 owed, paid in two goes: 60 up front, the other 52 at maturity.
        lenderRepaids: [repaid('rp1', '60000000', apr1), repaid('rp2', '52000000', apr1 + 100)]
      }),
      ctx
    )
    const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(paid.map((e) => [e.id, e.creditRemainingUsd])).toEqual([
      ['rp1-principal', 52],
      ['rp2-principal', 0],
      ['rp2-interest', 0]
    ])
  })

  it('costs the same flat fee when the round is settled early', () => {
    // The contract prorates nothing: repaying a month into a three-month term
    // still owes the whole 12, and the books already said so on day one.
    const feb1 = Math.floor(Date.parse('2026-02-01T00:00:00Z') / 1000)
    const entries = mapFixedReturnEvents(
      round({ lenderRepaids: [repaid('rp1', '112000000', feb1)] }),
      ctx
    )
    const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(paid.map((e) => e.debit)).toEqual(['Loan Payable', 'Interest Payable'])
    expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
    expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(0, 6)
  })

  it('falls back to expensing at payment when the round rate is unavailable', () => {
    const entries = mapFixedReturnEvents(
      round({ offerTerms: [], lenderRepaids: [repaid('rp1', '112000000', apr1)] }),
      ctx
    )
    expect(entries.filter((e) => e.useCase === 'UC-CREDIT-05')).toHaveLength(0)
    const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(paid.map((e) => e.debit)).toEqual(['Loan Payable', 'Interest Expense'])
    expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
  })

  it('keeps both repayment legs pointing at the transaction that paid them', () => {
    const txHash = `0x${'a'.repeat(64)}`
    const entries = mapFixedReturnEvents(
      round({ lenderRepaids: [repaid(`${txHash}-4`, '112000000', apr1)] }),
      ctx
    )
    const legs = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(legs).toHaveLength(2)
    legs.forEach((entry) => expect(entry.txHash).toBe(txHash))
  })
})
