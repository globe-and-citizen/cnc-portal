import { describe, expect, it } from 'vitest'
import {
  gradientForAddress,
  lendingOfferToCreditRound,
  offerLenderToCreditLender,
  offerMaturityDate,
  offerStateToRoundStatus
} from '../communityCreditUtil'
import type { FixedReturnOfferLender, FixedReturnRawOffer, LendingOfferStruct } from '@/types'
import type { Address } from 'viem'

describe('communityCreditUtil on-chain mappers', () => {
  const baseOffer: LendingOfferStruct = {
    token: '0x0000000000000000000000000000000000000abc' as Address,
    fundingTarget: 40_000_000000n,
    interestRateBps: 500n, // 5%
    termDuration: 3,
    termUnit: 1, // months → 90 days
    startDate: 1_700_000_000n,
    subscriptionDeadline: 1_700_500_000n,
    fundingAccess: 1, // whitelist
    isCapEnabled: true,
    lenderCap: 10_000_000000n,
    totalFunded: 23_400_000000n,
    totalRepaidByIssuer: 0n,
    state: 0 // Open
  }
  const makeOffer = (over: Partial<LendingOfferStruct> = {}): LendingOfferStruct => ({
    ...baseOffer,
    ...over
  })
  const raw: FixedReturnRawOffer = { offerId: 7, decimals: 6, offer: baseOffer }

  describe('offerStateToRoundStatus', () => {
    // baseOffer.subscriptionDeadline is a fixed unix timestamp — pass `now` explicitly
    // wherever the Open/deadline boundary matters, rather than relying on the real clock.
    const beforeDeadline = new Date(1_700_400_000 * 1000)
    const afterDeadline = new Date(1_700_600_000 * 1000)

    it('maps Open / Funded / Refundable', () => {
      expect(offerStateToRoundStatus(makeOffer({ state: 0 }), beforeDeadline)).toBe('open')
      expect(offerStateToRoundStatus(makeOffer({ state: 1 }))).toBe('funded')
      expect(offerStateToRoundStatus(makeOffer({ state: 2 }))).toBe('refunded')
    })

    it('maps a still-Open offer past its deadline to stalled', () => {
      expect(offerStateToRoundStatus(makeOffer({ state: 0 }), afterDeadline)).toBe('stalled')
    })
    it('treats Repaying as active until principal + interest is fully repaid', () => {
      // totalFunded 1_000_000 @ 10% → expected 1_100_000
      const repaying = makeOffer({ state: 3, totalFunded: 1_000_000n, interestRateBps: 1000n })
      expect(offerStateToRoundStatus({ ...repaying, totalRepaidByIssuer: 500_000n })).toBe('active')
      expect(offerStateToRoundStatus({ ...repaying, totalRepaidByIssuer: 1_100_000n })).toBe(
        'repaid'
      )
    })
  })

  describe('lendingOfferToCreditRound', () => {
    // baseOffer.subscriptionDeadline is a fixed unix timestamp — pass `now` explicitly
    // so this asserts 'open' regardless of when the real clock happens to run the test.
    const beforeDeadline = new Date(1_700_400_000 * 1000)
    const afterDeadline = new Date(1_700_600_000 * 1000)

    it('scales amounts by decimals and maps rate, term and access', () => {
      const round = lendingOfferToCreditRound(raw, 'Q3 bridge', 'Payroll', beforeDeadline)
      expect(round.id).toBe('7')
      expect(round.name).toBe('Q3 bridge')
      expect(round.desc).toBe('Payroll')
      expect(round.target).toBe(40000)
      expect(round.raised).toBe(23400)
      expect(round.rate).toBe(5)
      expect(round.period).toBe(90) // 3 months × 30
      expect(round.restricted).toBe(true)
      expect(round.cap).toBe(10000)
      expect(round.status).toBe('open')
      expect(round.fundable).toBe(true)
      expect(round.lenders).toEqual([])
    })

    it('maps to stalled and not fundable once the deadline has passed without reaching target', () => {
      const round = lendingOfferToCreditRound(raw, 'Q3 bridge', 'Payroll', afterDeadline)
      expect(round.status).toBe('stalled')
      expect(round.fundable).toBe(false)
    })
    it('scales totalRepaid by decimals, same as raised', () => {
      const round = lendingOfferToCreditRound({
        ...raw,
        offer: makeOffer({ totalRepaidByIssuer: 12_345_000000n })
      })
      expect(round.totalRepaid).toBe(12345)
    })
    it('falls back to generic title/purpose and null cap', () => {
      const round = lendingOfferToCreditRound({
        ...raw,
        offer: makeOffer({ isCapEnabled: false, fundingAccess: 0 })
      })
      expect(round.name).toBe('Round #7')
      expect(round.desc).toContain('fixed-return')
      expect(round.cap).toBeNull()
      expect(round.restricted).toBe(false)
    })

    it('renders unset dates as — and stamps repaidOn only when repaid', () => {
      const noDeadline = lendingOfferToCreditRound({
        ...raw,
        offer: makeOffer({ subscriptionDeadline: 0n })
      })
      expect(noDeadline.deadline).toBe('—')
      expect(noDeadline.repaidOn).toBeUndefined()

      const repaid = lendingOfferToCreditRound({
        ...raw,
        offer: makeOffer({
          state: 3,
          totalFunded: 1_000_000n,
          interestRateBps: 1000n,
          totalRepaidByIssuer: 1_100_000n
        })
      })
      expect(repaid.status).toBe('repaid')
      expect(repaid.repaidOn).toBe(repaid.maturity)
    })
  })

  describe('offerLenderToCreditLender', () => {
    const lender: FixedReturnOfferLender = {
      address: '0xABCDEF0000000000000000000000000000000001' as Address,
      principal: 5000,
      expected: 5250
    }
    it('resolves the name, shortens the address and flags the connected lender', () => {
      const mapped = offerLenderToCreditLender(
        lender,
        () => 'Alice',
        '0xabcdef0000000000000000000000000000000001'
      )
      expect(mapped.name).toBe('Alice')
      expect(mapped.amount).toBe(5000)
      expect(mapped.you).toBe(true) // case-insensitive match
      expect(mapped.addr).toContain('...')
      expect(mapped.gradient).toMatch(/^#[0-9a-f]+,#[0-9a-f]+$/i)
    })
    it('is not "you" for a different connected address', () => {
      expect(offerLenderToCreditLender(lender, () => 'Bob', '0xdead').you).toBe(false)
    })
    it('defaults paid to 0 when no round totals are given', () => {
      expect(offerLenderToCreditLender(lender, () => 'Alice').paid).toBe(0)
    })
    it("estimates paid as this lender's proportional share of the round's totalRepaid", () => {
      // lender.principal (5000) is 25% of round.raised (20000) → 25% of totalRepaid (4000).
      const mapped = offerLenderToCreditLender(lender, () => 'Alice', undefined, {
        raised: 20000,
        totalRepaid: 4000
      })
      expect(mapped.paid).toBe(1000)
    })
    it('is 0 when nothing has been raised yet, even with a round object present', () => {
      const mapped = offerLenderToCreditLender(lender, () => 'Alice', undefined, {
        raised: 0,
        totalRepaid: 0
      })
      expect(mapped.paid).toBe(0)
    })
    it("flags refunded once refundLenders has zeroed this lender's principal", () => {
      const refundedLender: FixedReturnOfferLender = { ...lender, principal: 0, expected: 0 }
      const mapped = offerLenderToCreditLender(refundedLender, () => 'Alice', undefined, {
        raised: 20000,
        totalRepaid: 0,
        status: 'refunded'
      })
      expect(mapped.refunded).toBe(true)
    })
    it('is not refunded when principal is 0 but the round is not in the refunded state', () => {
      const mapped = offerLenderToCreditLender(lender, () => 'Alice', undefined, {
        raised: 20000,
        totalRepaid: 0,
        status: 'active'
      })
      expect(mapped.refunded).toBe(false)
    })
  })

  describe('gradientForAddress', () => {
    it('is deterministic and yields two distinct hex stops', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678'
      const [a, b] = gradientForAddress(address).split(',')
      expect(gradientForAddress(address)).toBe(`${a},${b}`)
      expect(a).not.toBe(b)
    })
  })

  describe('offerMaturityDate', () => {
    it('adds the term (in days) to the start date', () => {
      const date = offerMaturityDate(
        makeOffer({ startDate: 1_700_000_000n, termDuration: 30, termUnit: 0 })
      )
      expect(date.getTime()).toBe((1_700_000_000 + 30 * 86_400) * 1000)
    })
  })
})
