import { describe, it, expect } from 'vitest'
import { mapFixedReturnEvents } from '@/utils/accounting/mappers/fixedReturn'
import { makeCtx, ADDR, creditOffer, creditEvent } from './fixtures'

const ctx = makeCtx()
// The three per-lender feeds share one row shape; the alias names the event.
const offer = creditOffer
const lent = creditEvent
const repaid = creditEvent
const refunded = creditEvent

describe('mapFixedReturnEvents', () => {
  it('books nothing for a lender deposit until the round funds (external contract)', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '4000000', 200)]
      },
      ctx
    )
    // A pledge into an offer still filling is the lender's money, not the team's,
    // so nothing is posted until the round actually funds.
    expect(entries).toEqual([])
  })

  it('recognises the loan straight to Bank when the round funds, one leg per lender', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '4000000', 200), lent('fl2', '6000000', 300, ADDR.client)],
        // Emitted in the same transaction as the deposit that hit the target.
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 300 }
        ]
      },
      ctx
    )
    const principal = entries.filter((e) => e.useCase === 'UC-CREDIT-01')
    // The whole principal lands in Bank, split per lender in first-lent order.
    expect(principal.map((e) => [e.debit, e.credit, e.amountUsd, e.internal])).toEqual([
      ['Cash — Bank', 'Loan Payable', 4, false],
      ['Cash — Bank', 'Loan Payable', 6, false]
    ])
    // The external credit pocket is never touched — no more in-and-out sweep.
    const touchesCredit = entries.some(
      (e) => e.debit === 'Cash — Credit' || e.credit === 'Cash — Credit'
    )
    expect(touchesCredit).toBe(false)
  })

  it('splits a repayment into its principal and interest legs, principal first', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '10000000', 200)],
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 200 }
        ],
        // Two installments totalling 11 USDC — 10 principal + 1 fixed return.
        lenderRepaids: [repaid('rp1', '6000000', 400), repaid('rp2', '5000000', 500)]
      },
      ctx
    )
    const repayments = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
    expect(repayments).toHaveLength(3)
    expect(repayments.map((e) => [e.id, e.debit, e.amountUsd])).toEqual([
      ['rp1-principal', 'Loan Payable', 6],
      // The second installment retires the last 4 of principal; the rest is interest.
      ['rp2-principal', 'Loan Payable', 4],
      // No offer terms here, so no fee was recognised at funding: the whole fixed
      // return is expensed on the day it is paid (the cash-basis fallback).
      ['rp2-interest-unrecognised', 'Interest Expense', 1]
    ])
    repayments.forEach((e) => expect(e.credit).toBe('Cash — Bank'))
  })

  it('clears Loan Payable once the lender has been made whole', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '10000000', 200)],
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 200 }
        ],
        lenderRepaids: [repaid('rp1', '11000000', 400)]
      },
      ctx
    )
    const payable = entries.reduce(
      (sum, e) =>
        sum +
        (e.credit === 'Loan Payable' ? e.amountUsd : 0) -
        (e.debit === 'Loan Payable' ? e.amountUsd : 0),
      0
    )
    expect(payable).toBe(0)
  })

  it('books nothing when an unfunded offer refunds its lenders', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '4000000', 200)],
        principalRefundeds: [refunded('pr1', '4000000', 900)]
      },
      ctx
    )
    // Nothing was booked when the deposit came in, so its return is invisible too.
    expect(entries).toEqual([])
  })

  it('replays out-of-order feeds chronologically so the funded loan carries every deposit', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        // Newest first — the funded loan must still see both deposits, oldest first.
        fundsLents: [lent('fl2', '6000000', 300, ADDR.client), lent('fl1', '4000000', 200)],
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 300 }
        ]
      },
      ctx
    )
    expect(entries.map((e) => e.id)).toEqual([
      `credit-principal-1-${ADDR.lender}`,
      `credit-principal-1-${ADDR.client}`
    ])
    expect(entries.reduce((sum, e) => sum + Number(e.rawAmount), 0)).toBe(10000000)
  })

  it('flags an offer whose creation event (and therefore its token) is missing', () => {
    const entries = mapFixedReturnEvents(
      { fundsLents: [lent('fl1', '4000000', 200), lent('fl2', '5000000', 300)] },
      ctx
    )
    // One memo for the whole round, not one per event — and no monetary legs, so
    // the trial balance is untouched by a round nobody could value.
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      id: 'credit-unvalued-1',
      debit: null,
      credit: null,
      amountUsd: 0,
      enrichment: 'needs-off-chain-data'
    })
    expect(entries[0]?.memo).toContain('could not be valued')
  })

  it('keeps two offers independent', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer('1'), offer('2')],
        fundsLents: [
          lent('fl1', '4000000', 200, ADDR.lender, '1'),
          lent('fl2', '3000000', 250, ADDR.lender, '2')
        ],
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 300 }
        ]
      },
      ctx
    )
    const principal = entries.filter((e) => e.useCase === 'UC-CREDIT-01')
    // Only offer #1 funded — offer #2 is still open, so nothing is booked for it.
    expect(principal.map((e) => [e.creditOfferId, e.rawAmount])).toEqual([['1', '4000000']])
  })
})
