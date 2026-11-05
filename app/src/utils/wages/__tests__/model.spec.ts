import { describe, expect, it } from 'vitest'
import type { Address } from 'viem'
import type { RatePerHour, WeeklyClaim } from '@/types'
import {
  buildClaimRatesWithOvertime,
  buildWageClaimPayload,
  computeClaimTokenAmounts
} from '../model'

const MINUTES_26H30 = 26 * 60 + 30
const MINUTES_20H = 20 * 60

const usdcAndSherWage = {
  maximumHoursPerWeek: 25,
  ratePerHour: [
    { type: 'usdc', amount: 9 },
    { type: 'sher', amount: 1 }
  ] as RatePerHour[],
  overtimeRatePerHour: [{ type: 'sher', amount: 5 }] as RatePerHour[]
}

const contractPayout = (minutesWorked: number, hourlyRate: bigint) =>
  (BigInt(minutesWorked) * hourlyRate) / 60n

const ratesFor = (totalMinutesWorked: number, wage = usdcAndSherWage) =>
  buildClaimRatesWithOvertime({ totalMinutesWorked, ...wage })

describe('buildClaimRatesWithOvertime', () => {
  it('[AC-US-PAYROLL-008-17] pays no overtime in a token the overtime rate does not name', () => {
    const usdc = ratesFor(MINUTES_26H30).find((rate) => rate.type === 'usdc')

    expect(usdc?.totalAmount).toBe(225_000_000n)
    expect(contractPayout(MINUTES_26H30, usdc!.hourlyRate)).toBe(224_999_999n)
  })

  it('[AC-US-PAYROLL-008-17] pays overtime at the overtime rate in the token it names', () => {
    const sher = ratesFor(MINUTES_26H30).find((rate) => rate.type === 'sher')

    expect(sher?.totalAmount).toBe(32_500_000n)
    expect(contractPayout(MINUTES_26H30, sher!.hourlyRate)).toBe(32_499_997n)
  })

  it('[AC-US-PAYROLL-008-17] never lets the contract pay more than the wage total', () => {
    for (const { hourlyRate, totalAmount } of ratesFor(MINUTES_26H30)) {
      expect(contractPayout(MINUTES_26H30, hourlyRate)).toBeLessThanOrEqual(totalAmount)
    }
  })

  it('[AC-US-PAYROLL-008-17] agrees with the total shown for every token', () => {
    const shown = computeClaimTokenAmounts(MINUTES_26H30, usdcAndSherWage)
    const signed = ratesFor(MINUTES_26H30).map(({ type, totalAmount }) => ({
      type,
      amount: Number(totalAmount) / 1e6
    }))

    expect(signed).toEqual(shown)
  })

  it('[AC-US-PAYROLL-008-17] pays a token that only the overtime rate names', () => {
    const rates = ratesFor(MINUTES_26H30, {
      ...usdcAndSherWage,
      ratePerHour: [{ type: 'usdc', amount: 9 }]
    })

    expect(rates.map(({ type, totalAmount }) => [type, totalAmount])).toEqual([
      ['usdc', 225_000_000n],
      ['sher', 7_500_000n]
    ])
  })

  it('leaves an overtime-only token out of a week without overtime', () => {
    const rates = ratesFor(MINUTES_20H, {
      ...usdcAndSherWage,
      ratePerHour: [{ type: 'usdc', amount: 9 }]
    })

    expect(rates.map(({ type }) => type)).toEqual(['usdc'])
  })

  it('signs the plain hourly rates for a week without overtime', () => {
    expect(ratesFor(MINUTES_20H).map(({ hourlyRate }) => hourlyRate)).toEqual([
      9_000_000n,
      1_000_000n
    ])
  })

  it('pays every minute at the regular rate when the wage has no overtime rate', () => {
    const [usdc] = ratesFor(MINUTES_26H30, {
      ...usdcAndSherWage,
      overtimeRatePerHour: []
    })

    expect(usdc?.totalAmount).toBe(238_500_000n)
    expect(usdc?.hourlyRate).toBe(9_000_000n)
  })

  it('keeps the regular rate on a claim without minutes', () => {
    const [usdc] = ratesFor(0)

    expect(usdc?.hourlyRate).toBe(9_000_000n)
    expect(usdc?.totalAmount).toBe(0n)
  })

  it('uses 18 decimals for the native token', () => {
    const [native] = buildClaimRatesWithOvertime({
      totalMinutesWorked: 60,
      ratePerHour: [{ type: 'native', amount: 1 }]
    })

    expect(native?.totalAmount).toBe(1_000_000_000_000_000_000n)
  })
})

describe('buildWageClaimPayload', () => {
  it('[AC-US-PAYROLL-008-17] signs one blended rate per token for the whole week', () => {
    const employeeAddress = '0x1111111111111111111111111111111111111111' as Address
    const weeklyClaim = {
      minutesWorked: MINUTES_26H30,
      createdAt: '2026-10-05T00:00:00.000Z',
      wage: { ...usdcAndSherWage, userAddress: employeeAddress }
    } as unknown as Pick<WeeklyClaim, 'minutesWorked' | 'createdAt' | 'wage'>

    const payload = buildWageClaimPayload({
      weeklyClaim,
      getTokenAddress: (type) => `0x${type}` as Address
    })

    expect(payload.minutesWorked).toBe(MINUTES_26H30)
    expect(payload.employeeAddress).toBe(employeeAddress)
    expect(payload.wages).toEqual([
      { hourlyRate: 8_490_566n, tokenAddress: '0xusdc' },
      { hourlyRate: 1_226_415n, tokenAddress: '0xsher' }
    ])
  })
})

describe('computeClaimTokenAmounts', () => {
  it('returns nothing without a wage', () => {
    expect(computeClaimTokenAmounts(MINUTES_26H30, null)).toEqual([])
  })

  it('shows an overtime-only token at zero in a week without overtime', () => {
    const amounts = computeClaimTokenAmounts(MINUTES_20H, {
      ...usdcAndSherWage,
      ratePerHour: [{ type: 'usdc', amount: 9 }]
    })

    expect(amounts).toEqual([
      { type: 'usdc', amount: 180 },
      { type: 'sher', amount: 0 }
    ])
  })
})
