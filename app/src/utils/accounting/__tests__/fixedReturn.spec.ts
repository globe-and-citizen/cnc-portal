import { describe, it, expect } from 'vitest'
import { mapFixedReturnEvents } from '@/utils/accounting/mappers/fixedReturn'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

/** One USDC offer, created at t=100 — the token index every other event needs. */
const offer = (offerId = '1', timestamp = 100) => ({
  id: `created-${offerId}`,
  contractAddress: ADDR.credit,
  offerId,
  token: ADDR.usdcToken,
  fundingTarget: '10000000',
  timestamp
})

const lent = (
  id: string,
  amount: string,
  timestamp: number,
  lender: string = ADDR.lender,
  offerId = '1'
) => ({ id, contractAddress: ADDR.credit, offerId, lender, amount, timestamp })

const repaid = lent
const refunded = lent

describe('mapFixedReturnEvents', () => {
  it('books a lender deposit as UC-CREDIT-01 (Cash — Credit → Loan Payable)', () => {
    const [entry] = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '4000000', 200)]
      },
      ctx
    )
    expect(entry).toMatchObject({
      useCase: 'UC-CREDIT-01',
      debit: 'Cash — Credit',
      credit: 'Loan Payable',
      amountUsd: 4, // 4 USDC × $1
      token: 'usdc',
      rawAmount: '4000000',
      internal: false
    })
    expect(entry.counterparty?.toLowerCase()).toBe(ADDR.lender)
  })

  it('sweeps the accumulated principal to Bank as an internal UC-CREDIT-02 move', () => {
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
    const sweep = entries.find((e) => e.useCase === 'UC-CREDIT-02')
    expect(sweep).toMatchObject({
      debit: 'Cash — Bank',
      credit: 'Cash — Credit',
      rawAmount: '10000000', // both deposits, not just the last one
      amountUsd: 10,
      internal: true
    })
    // The credit pocket nets to zero: 4 + 6 in, 10 out.
    const creditNet = entries.reduce(
      (sum, e) =>
        sum +
        (e.debit === 'Cash — Credit' ? e.amountUsd : 0) -
        (e.credit === 'Cash — Credit' ? e.amountUsd : 0),
      0
    )
    expect(creditNet).toBe(0)
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
      ['rp2-interest', 'Interest Expense', 1]
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

  it('books a refund on an unfunded offer as UC-CREDIT-04 (Loan Payable → Cash — Credit)', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        fundsLents: [lent('fl1', '4000000', 200)],
        principalRefundeds: [refunded('pr1', '4000000', 900)]
      },
      ctx
    )
    expect(entries.at(-1)).toMatchObject({
      useCase: 'UC-CREDIT-04',
      debit: 'Loan Payable',
      credit: 'Cash — Credit',
      amountUsd: 4,
      internal: false
    })
  })

  it('replays out-of-order feeds chronologically so the sweep carries every deposit', () => {
    const entries = mapFixedReturnEvents(
      {
        lendingOfferCreateds: [offer()],
        // Newest first — the sweep must still see both deposits.
        fundsLents: [lent('fl2', '6000000', 300, ADDR.client), lent('fl1', '4000000', 200)],
        lendingOfferFundeds: [
          { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: 300 }
        ]
      },
      ctx
    )
    expect(entries.map((e) => e.id)).toEqual(['fl1', 'fl2', 'fd1'])
    expect(entries.at(-1)?.rawAmount).toBe('10000000')
  })

  it('skips an offer whose creation event (and therefore its token) is missing', () => {
    const entries = mapFixedReturnEvents({ fundsLents: [lent('fl1', '4000000', 200)] }, ctx)
    expect(entries).toEqual([])
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
    const sweep = entries.find((e) => e.useCase === 'UC-CREDIT-02')
    // Only offer #1's principal is swept — offer #2 is still open.
    expect(sweep?.rawAmount).toBe('4000000')
  })
})
