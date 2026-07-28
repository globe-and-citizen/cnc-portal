import { describe, it, expect } from 'vitest'
import { mapFixedReturnEvents } from '@/utils/accounting/mappers/fixedReturn'
import { txHashOf } from '@/utils/accounting/mergeBankFees'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { makeCtx, ADDR } from './fixtures'

const ctx = makeCtx()

/** Σ of an account's debit legs, in USD — what a cost account was charged. */
const totalDebited = (entries: readonly LedgerEntry[], account: string): number =>
  entries.reduce((sum, e) => sum + (e.debit === account ? e.amountUsd : 0), 0)

/** A liability's net balance — what it still owes once every leg is booked. */
const balanceOf = (entries: readonly LedgerEntry[], account: string): number =>
  entries.reduce(
    (sum, e) =>
      sum + (e.credit === account ? e.amountUsd : 0) - (e.debit === account ? e.amountUsd : 0),
    0
  )

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
      // No offer terms here, so nothing was accrued: the whole fixed return is
      // expensed on the day it is paid (the cash-basis fallback).
      ['rp2-interest-unaccrued', 'Interest Expense', 1]
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

  describe('interest accrual', () => {
    const jan1 = Math.floor(Date.parse('2026-01-01T00:00:00Z') / 1000)
    const apr1 = Math.floor(Date.parse('2026-04-01T00:00:00Z') / 1000)

    /** 100 USDC raised on Jan 1, 12% flat, due Apr 1 — 12 USDC of fixed return. */
    const round = (over: Record<string, unknown> = {}) => ({
      lendingOfferCreateds: [offer('1', jan1 - 100)],
      fundsLents: [lent('fl1', '100000000', jan1)],
      lendingOfferFundeds: [
        { id: 'fd1', contractAddress: ADDR.credit, offerId: '1', timestamp: jan1 }
      ],
      offerTerms: [{ offerId: '1', interestRateBps: 1200, maturityDate: apr1 }],
      ...over
    })

    it('books the fixed return month by month instead of at payment', () => {
      const entries = mapFixedReturnEvents(round({ asOf: new Date('2026-03-01T00:00:00Z') }), ctx)
      const accruals = entries.filter((e) => e.useCase === 'UC-CREDIT-05')
      // Jan 31, Feb 28 and the Mar 1 cutoff.
      expect(accruals).toHaveLength(3)
      accruals.forEach((e) =>
        expect(e).toMatchObject({
          debit: 'Interest Expense',
          credit: 'Interest Payable',
          token: 'usdc',
          internal: false
        })
      )
      // 59 of the term's 90 days have run, so 12 × 59/90 of the fixed return.
      const booked = accruals.reduce((sum, e) => sum + e.amountUsd, 0)
      expect(booked).toBeCloseTo(7.8667, 3)
    })

    it('settles the accrued interest against Interest Payable, not a fresh expense', () => {
      const entries = mapFixedReturnEvents(
        round({
          asOf: new Date('2026-05-01T00:00:00Z'),
          lenderRepaids: [repaid('rp1', '112000000', apr1)]
        }),
        ctx
      )
      const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
      expect(paid.map((e) => [e.debit, e.amountUsd])).toEqual([
        ['Loan Payable', 100],
        ['Interest Payable', 12]
      ])
      // The whole cost was recognised over the term, so nothing is left owing.
      expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(0, 6)
      expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
    })

    it('expenses the part never accrued when a round is settled early', () => {
      // Repaid a month into a three-month term: only ~1/3 had accrued.
      const feb1 = Math.floor(Date.parse('2026-02-01T00:00:00Z') / 1000)
      const entries = mapFixedReturnEvents(
        round({
          asOf: new Date('2026-02-01T12:00:00Z'),
          lenderRepaids: [repaid('rp1', '112000000', feb1)]
        }),
        ctx
      )
      const paid = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
      expect(paid.map((e) => e.debit)).toEqual([
        'Loan Payable',
        'Interest Payable',
        'Interest Expense'
      ])
      // However the 12 is split between the two interest legs, the cost booked is
      // exactly what the lender was paid — and no interest is left outstanding.
      expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
      expect(balanceOf(entries, 'Interest Payable')).toBeCloseTo(0, 6)
    })

    it('stops accruing once the round has been settled', () => {
      const feb1 = Math.floor(Date.parse('2026-02-01T00:00:00Z') / 1000)
      const entries = mapFixedReturnEvents(
        round({
          asOf: new Date('2026-06-01T00:00:00Z'),
          lenderRepaids: [repaid('rp1', '112000000', feb1)]
        }),
        ctx
      )
      // The schedule keeps running to maturity, but every later point finds the
      // whole fixed return already expensed and books nothing.
      expect(totalDebited(entries, 'Interest Expense')).toBeCloseTo(12, 6)
    })

    it('keeps both repayment legs pointing at the transaction that paid them', () => {
      const txHash = `0x${'a'.repeat(64)}`
      const entries = mapFixedReturnEvents(
        round({
          asOf: new Date('2026-05-01T00:00:00Z'),
          lenderRepaids: [repaid(`${txHash}-4`, '112000000', apr1)]
        }),
        ctx
      )
      const legs = entries.filter((e) => e.useCase === 'UC-CREDIT-03')
      expect(legs).toHaveLength(2)
      legs.forEach((e) => expect(txHashOf(e)).toBe(txHash))
    })
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
    const sweep = entries.find((e) => e.useCase === 'UC-CREDIT-02')
    // Only offer #1's principal is swept — offer #2 is still open.
    expect(sweep?.rawAmount).toBe('4000000')
  })
})
