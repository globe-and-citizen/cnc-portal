import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import { USDC_ADDRESS } from '@/constant'
import type { CreditOfferForm, FixedReturnWhitelistEntry, LendingOfferStruct } from '@/types'
import {
  decimalsForFixedReturnToken,
  findCreditToken,
  isLendingOfferAcceptingFunds,
  percentOf,
  sumWhitelistAmount,
  toFixedReturnOfferParams,
  toLenderOffering
} from '../communityCreditOfferUtil'

const ARBITRARY_TOKEN = '0x1111111111111111111111111111111111111111' as const

function baseForm(overrides: Partial<CreditOfferForm> = {}): CreditOfferForm {
  return {
    title: 'Test Note',
    purpose: '',
    principal: 100000,
    rate: 8,
    termValue: 12,
    termUnit: 'months',
    deadline: '2026-06-30',
    access: 'general',
    capOn: false,
    cap: 0,
    token: 'USDC',
    ...overrides
  }
}

describe('sumWhitelistAmount', () => {
  it('sums the amounts of all entries', () => {
    expect(sumWhitelistAmount([{ amount: 100 }, { amount: 250 }])).toBe(350)
  })

  it('treats null amounts as zero', () => {
    expect(sumWhitelistAmount([{ amount: 100 }, { amount: null }])).toBe(100)
  })

  it('returns zero for an empty list', () => {
    expect(sumWhitelistAmount([])).toBe(0)
  })
})

describe('percentOf', () => {
  it('computes a rounded percentage', () => {
    expect(percentOf(1, 3)).toBe(33)
  })

  it('clamps to 100 when the numerator exceeds the denominator', () => {
    expect(percentOf(150, 100)).toBe(100)
  })

  it('returns zero when the denominator is zero', () => {
    expect(percentOf(50, 0)).toBe(0)
  })
})

describe('findCreditToken', () => {
  it('resolves a supported ERC20 token by symbol', () => {
    expect(findCreditToken('USDC')?.id).toBe('usdc')
  })

  it('excludes the native token even if its symbol matches', () => {
    expect(findCreditToken('native')).toBeUndefined()
  })

  it('returns undefined for an unknown symbol', () => {
    expect(findCreditToken('NOPE')).toBeUndefined()
  })

  it('returns undefined for an undefined symbol', () => {
    expect(findCreditToken(undefined)).toBeUndefined()
  })
})

describe('toFixedReturnOfferParams', () => {
  it('scales amounts by the token decimals and maps enum indices for a General offer', () => {
    const params = toFixedReturnOfferParams(
      baseForm({ principal: 100000, rate: 8.5, termUnit: 'days', access: 'general' }),
      []
    )

    expect(params.fundingTarget).toBe(100000_000000n)
    expect(params.interestRateBps).toBe(850n)
    expect(params.termUnit).toBe(0)
    expect(params.fundingAccess).toBe(0)
    expect(params.whitelistAddrs).toEqual([])
    expect(params.allocations).toEqual([])
  })

  it('uses the subscription deadline as the term start at the end of the selected UTC day', () => {
    const params = toFixedReturnOfferParams(baseForm({ deadline: '2026-06-30' }), [])

    expect(params.startDate).toBe(BigInt(Date.UTC(2026, 5, 30, 23, 59, 59) / 1000))
    expect(params.subscriptionDeadline).toBe(BigInt(Date.UTC(2026, 5, 30, 23, 59, 59) / 1000))
  })

  it('sets lenderCap to zero when isCapEnabled is false, regardless of the cap field', () => {
    const params = toFixedReturnOfferParams(baseForm({ capOn: false, cap: 5000 }), [])
    expect(params.isCapEnabled).toBe(false)
    expect(params.lenderCap).toBe(0n)
  })

  it('scales lenderCap by token decimals when isCapEnabled is true', () => {
    const params = toFixedReturnOfferParams(baseForm({ capOn: true, cap: 5000 }), [])
    expect(params.isCapEnabled).toBe(true)
    expect(params.lenderCap).toBe(5000_000000n)
  })

  it('encodes whitelist addresses and allocations for a Whitelist offer', () => {
    const whitelist: FixedReturnWhitelistEntry[] = [
      { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: 30000 },
      { username: '@b', address: '0x2222222222222222222222222222222222222222', amount: 20000 }
    ]
    const params = toFixedReturnOfferParams(baseForm({ access: 'whitelist' }), whitelist)

    expect(params.fundingAccess).toBe(1)
    expect(params.whitelistAddrs).toEqual([
      '0x1111111111111111111111111111111111111111',
      '0x2222222222222222222222222222222222222222'
    ])
    expect(params.allocations).toEqual([30000_000000n, 20000_000000n])
  })

  it('treats a null whitelist amount as zero', () => {
    const whitelist: FixedReturnWhitelistEntry[] = [
      { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: null }
    ]
    const params = toFixedReturnOfferParams(baseForm({ access: 'whitelist' }), whitelist)
    expect(params.allocations).toEqual([0n])
  })

  it('throws for a token that is not in SUPPORTED_TOKENS (excluding native)', () => {
    expect(() => toFixedReturnOfferParams(baseForm({ token: 'native' }), [])).toThrow(
      /Unsupported token/
    )
  })
})

describe('toLenderOffering', () => {
  const DECIMALS = 6
  const lendOffer = (over: Partial<LendingOfferStruct> = {}): LendingOfferStruct => ({
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
    ...over
  })

  it('allows any lender for a General offer with no cap', () => {
    const offering = toLenderOffering(
      1,
      lendOffer({ fundingAccess: 0, isCapEnabled: false }),
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
      lendOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
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
      lendOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
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
      lendOffer({ fundingAccess: 0, isCapEnabled: true, lenderCap: 5000_000000n }),
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
    const offering = toLenderOffering(1, lendOffer({ fundingAccess: 1 }), DECIMALS, 0n, 0n)
    expect(offering.allowed).toBe(false)
    expect(offering.cap).toBe(0)
  })

  it('allows a Whitelist offer and caps at the personal allocation', () => {
    const offering = toLenderOffering(
      1,
      lendOffer({ fundingAccess: 1 }),
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
      lendOffer({ fundingAccess: 1 }),
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
      lendOffer({ fundingAccess: 1, isCapEnabled: true, lenderCap: 999_000000n }),
      DECIMALS,
      10000_000000n,
      0n
    )
    expect(offering.cap).toBe(10000)
  })

  it('limits a repeat lender by the offer-wide funding still available', () => {
    const offering = toLenderOffering(
      1,
      lendOffer({
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
      lendOffer({ totalFunded: 100000_000000n }),
      DECIMALS,
      0n,
      0n
    )

    expect(offering.allowed).toBe(false)
    expect(offering.remaining).toBe(0)
    expect(offering.pct).toBe(100)
  })

  it('falls back to a Round-numbered title when none is given', () => {
    const offering = toLenderOffering(9, lendOffer(), DECIMALS, 0n, 0n)
    expect(offering.title).toBe('Round #9')
  })
})

describe('isLendingOfferAcceptingFunds', () => {
  const deadlineSeconds = 1893369600
  const deadline = new Date(deadlineSeconds * 1000)
  const baseOffer: LendingOfferStruct = {
    token: USDC_ADDRESS,
    fundingTarget: 100000_000000n,
    interestRateBps: 800n,
    termDuration: 12,
    termUnit: 1,
    startDate: 1893456000n,
    subscriptionDeadline: BigInt(deadlineSeconds),
    fundingAccess: 0,
    isCapEnabled: false,
    lenderCap: 0n,
    totalFunded: 30000_000000n,
    totalRepaidByIssuer: 0n,
    state: 0
  }

  it('accepts an Open offer through its deadline', () => {
    expect(isLendingOfferAcceptingFunds(baseOffer, deadline)).toBe(true)
  })

  it('rejects an Open offer after its deadline', () => {
    expect(isLendingOfferAcceptingFunds(baseOffer, new Date((deadlineSeconds + 1) * 1000))).toBe(
      false
    )
  })

  it('rejects an offer that is no longer Open', () => {
    expect(isLendingOfferAcceptingFunds({ ...baseOffer, state: 1 }, deadline)).toBe(false)
  })
})

describe('decimalsForFixedReturnToken', () => {
  it('resolves a known token from SUPPORTED_TOKENS', () => {
    // USDC is always present and 6-decimal — see SUPPORTED_TOKENS in @/constant.
    expect(decimalsForFixedReturnToken(findCreditToken('USDC')!.address as Address)).toBe(6)
  })

  it('returns undefined for a token outside SUPPORTED_TOKENS', () => {
    expect(decimalsForFixedReturnToken(ARBITRARY_TOKEN)).toBeUndefined()
  })
})
