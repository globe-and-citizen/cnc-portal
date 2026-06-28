import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import {
  moneyShort,
  pickerClass,
  sumWhitelistAmount,
  formatOfferingDate,
  addTerm,
  termLabel,
  maturityLabel,
  percentOf,
  expectedReturn,
  findOfferingToken,
  toFixedReturnOfferParams,
  fromLendingOfferStruct,
  toLenderOffering,
  decimalsForOfferingToken
} from '../offeringUtil'
import type { LendingOfferStruct, OfferingForm, WhitelistEntry } from '@/types'

const DECIMALS = 6

const ARBITRARY_TOKEN = '0x1111111111111111111111111111111111111111' as const

function baseOffer(overrides: Partial<LendingOfferStruct> = {}): LendingOfferStruct {
  return {
    token: ARBITRARY_TOKEN,
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

function baseForm(overrides: Partial<OfferingForm> = {}): OfferingForm {
  return {
    title: 'Test Note',
    purpose: '',
    principal: 100000,
    rate: 8,
    termValue: 12,
    termUnit: 'months',
    startDate: '2026-07-01',
    deadline: '2026-06-30',
    access: 'general',
    capOn: false,
    cap: 0,
    token: 'USDC',
    ...overrides
  }
}

describe('moneyShort', () => {
  it('formats a positive amount with a dollar sign and rounds to the nearest whole number', () => {
    expect(moneyShort(1234.6)).toBe('$1,235')
  })

  it('formats zero', () => {
    expect(moneyShort(0)).toBe('$0')
  })
})

describe('pickerClass', () => {
  it('returns the active styling when active is true', () => {
    expect(pickerClass(true).join(' ')).toContain('border-[#00bf7a]')
  })

  it('returns the inactive styling when active is false', () => {
    expect(pickerClass(false).join(' ')).toContain('border-[#e0eae5]')
  })
})

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

describe('formatOfferingDate', () => {
  it('formats an ISO date as "DD Mon YYYY"', () => {
    expect(formatOfferingDate('2026-07-01')).toBe('01 Jul 2026')
  })

  it('returns the original string for an invalid date', () => {
    expect(formatOfferingDate('not-a-date')).toBe('not-a-date')
  })
})

describe('addTerm', () => {
  const start = new Date('2026-01-15T00:00:00')

  it('adds days', () => {
    expect(addTerm(start, 10, 'days').toISOString().slice(0, 10)).toBe('2026-01-25')
  })

  it('adds months', () => {
    expect(addTerm(start, 3, 'months').toISOString().slice(0, 10)).toBe('2026-04-15')
  })

  it('adds years', () => {
    expect(addTerm(start, 2, 'years').toISOString().slice(0, 10)).toBe('2028-01-15')
  })
})

describe('termLabel', () => {
  it('pluralizes when the value is not 1', () => {
    expect(termLabel(12, 'months')).toBe('12 months')
  })

  it('keeps the noun singular when the value is 1', () => {
    expect(termLabel(1, 'years')).toBe('1 year')
  })

  it('labels a days term', () => {
    expect(termLabel(90, 'days')).toBe('90 days')
  })
})

describe('maturityLabel', () => {
  it('formats the maturity date as start date plus term', () => {
    expect(maturityLabel('2026-01-01', 6, 'months')).toBe('01 Jul 2026')
  })

  it('returns an em dash for an invalid start date', () => {
    expect(maturityLabel('invalid', 6, 'months')).toBe('—')
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

describe('expectedReturn', () => {
  it('returns principal plus interest at the given rate', () => {
    expect(expectedReturn(1000, 10)).toBe(1100)
  })

  it('returns the principal unchanged at a zero rate', () => {
    expect(expectedReturn(1000, 0)).toBe(1000)
  })
})

describe('findOfferingToken', () => {
  it('resolves a supported ERC20 token by symbol', () => {
    expect(findOfferingToken('USDC')?.id).toBe('usdc')
  })

  it('excludes the native token even if its symbol matches', () => {
    expect(findOfferingToken('native')).toBeUndefined()
  })

  it('returns undefined for an unknown symbol', () => {
    expect(findOfferingToken('NOPE')).toBeUndefined()
  })

  it('returns undefined for an undefined symbol', () => {
    expect(findOfferingToken(undefined)).toBeUndefined()
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

  it('converts ISO dates to unix seconds at UTC midnight', () => {
    const params = toFixedReturnOfferParams(
      baseForm({ startDate: '2026-07-01', deadline: '2026-06-30' }),
      []
    )

    expect(params.startDate).toBe(BigInt(Date.UTC(2026, 6, 1) / 1000))
    expect(params.subscriptionDeadline).toBe(BigInt(Date.UTC(2026, 5, 30) / 1000))
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
    const whitelist: WhitelistEntry[] = [
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
    const whitelist: WhitelistEntry[] = [
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
    expect(offering.remaining).toBeNull()
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
    expect(offering.limitsLabel).toBe('$5,000 cap')
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
    expect(offering.limitsLabel).toBe('$5,000 of $5,000 cap')
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
    expect(offering.limitsLabel).toBe('$2,000 of $5,000 cap')
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
    expect(offering.limitsLabel).toBe('$25,000 allocation')
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
    expect(offering.limitsLabel).toBe('$25,000 of $25,000 allocation')
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
