import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import {
  findOfferingToken,
  fromLendingOfferStruct,
  isLendingOfferAcceptingFunds,
  toLenderOffering,
  decimalsForOfferingToken
} from '../offeringUtil'
import { USDC_ADDRESS } from '@/constant'
import type { LendingOfferStruct } from '@/types'

const DECIMALS = 6

const ARBITRARY_TOKEN = '0x1111111111111111111111111111111111111111' as const

function baseOffer(overrides: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: USDC_ADDRESS,
    fundingTarget: 100000_000000n,
    interestRateBps: 800n,
    termDuration: 12,
    termUnit: 1,
    startDate: 1893456000n, // 2030-01-01T00:00:00Z
    subscriptionDeadline: 1893369600n,
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 30000_000000n,
    totalRepaidByIssuer: 0n,
    state: 0,
    ...overrides
  }
}

describe('fromLendingOfferStruct', () => {
  it('maps Open state to open status', () => {
    expect(fromLendingOfferStruct(1, baseOffer({ state: 0 }), DECIMALS).status).toBe('open')
  })

  it('maps Funded state to funded status', () => {
    expect(fromLendingOfferStruct(1, baseOffer({ state: 1 }), DECIMALS).status).toBe('funded')
  })

  it('maps Refundable state to closed status', () => {
    expect(fromLendingOfferStruct(1, baseOffer({ state: 2 }), DECIMALS).status).toBe('closed')
  })

  it('maps Repaying state to funded status', () => {
    expect(fromLendingOfferStruct(1, baseOffer({ state: 3 }), DECIMALS).status).toBe('funded')
  })

  it('scales amounts by the given decimals', () => {
    const summary = fromLendingOfferStruct(1, baseOffer(), DECIMALS)
    expect(summary.raised).toBe(30000)
    expect(summary.target).toBe(100000)
  })

  it('falls back to a generic title when none is provided', () => {
    expect(fromLendingOfferStruct(7, baseOffer(), DECIMALS).title).toBe('Offering #7')
  })

  it('uses the provided title when given', () => {
    expect(fromLendingOfferStruct(7, baseOffer(), DECIMALS, 'Riverside Note').title).toBe(
      'Riverside Note'
    )
  })
})

describe('toLenderOffering', () => {
  it('allows any lender for a General offer with no cap', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 0, isCapEnabled: false }),
      DECIMALS,
      0n,
      0n
    )
    expect(offering.allowed).toBe(true)
    expect(offering.cap).toBeNull()
    expect(offering.remaining).toBe(70000)
    expect(offering.limitsLabel).toBe('No cap')
  })

  it('caps a General offer with isCapEnabled at lenderCap', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
      DECIMALS,
      0n,
      0n
    )
    expect(offering.allowed).toBe(true)
    expect(offering.cap).toBe(5000)
    expect(offering.remaining).toBe(5000)
    expect(offering.limitsLabel).toBe('5,000 USDC cap')
  })

  it('disallows a General offer once the lender has deposited up to the cap', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
      DECIMALS,
      0n,
      5000_000000n
    )
    expect(offering.allowed).toBe(false)
    expect(offering.remaining).toBe(0)
    expect(offering.myDeposited).toBe(5000)
    expect(offering.limitsLabel).toBe('5,000 USDC cap')
  })

  it('allows a General offer with room left after a partial deposit', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
      DECIMALS,
      0n,
      2000_000000n
    )
    expect(offering.allowed).toBe(true)
    expect(offering.remaining).toBe(3000)
    expect(offering.myDeposited).toBe(2000)
    expect(offering.limitsLabel).toBe('5,000 USDC cap')
  })

  it('disallows a Whitelist offer when the lender has no allocation', () => {
    const offering = toLenderOffering(1, baseOffer({ fundingAccess: 1 }), DECIMALS, 0n, 0n)
    expect(offering.allowed).toBe(false)
    expect(offering.cap).toBe(0)
  })

  it('allows a Whitelist offer and caps at the personal allocation', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 1 }),
      DECIMALS,
      25000_000000n,
      0n
    )
    expect(offering.allowed).toBe(true)
    expect(offering.cap).toBe(25000)
    expect(offering.remaining).toBe(25000)
    expect(offering.limitsLabel).toBe('25,000 USDC allocation')
  })

  it('disallows a Whitelist offer once the lender has deposited up to their allocation', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 1 }),
      DECIMALS,
      25000_000000n,
      25000_000000n
    )
    expect(offering.allowed).toBe(false)
    expect(offering.remaining).toBe(0)
    expect(offering.limitsLabel).toBe('25,000 USDC allocation')
  })

  it('ignores lenderCap entirely in Whitelist mode', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ fundingAccess: 1, isCapEnabled: true, lenderCap: 999_000000n }),
      DECIMALS,
      10000_000000n,
      0n
    )
    expect(offering.cap).toBe(10000)
  })

  it('limits a repeat lender by the offer-wide funding still available', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({
        isCapEnabled: true,
        lenderCap: 2_000000n,
        totalFunded: 99999_500000n
      }),
      DECIMALS,
      0n,
      1_000000n
    )

    expect(offering.allowed).toBe(true)
    expect(offering.remaining).toBe(0.5)
    expect(offering.myDeposited).toBe(1)
  })

  it('disallows lending when no offer-wide funding remains', () => {
    const offering = toLenderOffering(
      1,
      baseOffer({ totalFunded: 100000_000000n }),
      DECIMALS,
      0n,
      0n
    )

    expect(offering.allowed).toBe(false)
    expect(offering.remaining).toBe(0)
    expect(offering.pct).toBe(100)
  })
})

describe('isLendingOfferAcceptingFunds', () => {
  const deadlineSeconds = Number(baseOffer().subscriptionDeadline)
  const deadline = new Date(deadlineSeconds * 1000)

  it('accepts an Open offer through its deadline', () => {
    expect(isLendingOfferAcceptingFunds(baseOffer(), deadline)).toBe(true)
  })

  it('rejects an Open offer after its deadline', () => {
    expect(isLendingOfferAcceptingFunds(baseOffer(), new Date((deadlineSeconds + 1) * 1000))).toBe(
      false
    )
  })

  it('rejects an offer that is no longer Open', () => {
    expect(isLendingOfferAcceptingFunds(baseOffer({ state: 1 }), deadline)).toBe(false)
  })
})

describe('decimalsForOfferingToken', () => {
  it('resolves a known token from SUPPORTED_TOKENS', () => {
    // USDC is always present and 6-decimal — see SUPPORTED_TOKENS in @/constant.
    expect(decimalsForOfferingToken(findOfferingToken('USDC')!.address as Address)).toBe(6)
  })

  it('returns undefined for a token outside SUPPORTED_TOKENS', () => {
    expect(decimalsForOfferingToken(ARBITRARY_TOKEN)).toBeUndefined()
  })
})
