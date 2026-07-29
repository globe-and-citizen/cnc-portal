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
