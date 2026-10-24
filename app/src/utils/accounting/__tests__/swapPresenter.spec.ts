import { describe, expect, it } from 'vitest'
import { verifyCowFees } from '@/utils/safe/cowSettlement'
import { presentSwapFees, swapBooking, swapFeeAmount, swapLabel } from '../swapPresenter'
import { swapFeeFixture } from './swapFeeFixtures'
import { ADDR } from './fixtures'

describe('Executed swap fee presentation', () => {
  it('[AC-US-ACCT-002-15] displays exact executed fees without changing the journal or adding gas', () => {
    const { target, execution, order, trade, journal } = swapFeeFixture()
    const before = structuredClone(journal)
    const result = presentSwapFees(target, verifyCowFees(target, execution, [order], [trade]))
    expect(swapLabel(target)).toBe('USDC → WETH')
    expect(result.totals.map((row) => row.amount)).toEqual(['3.870494 USDC'])
    expect(result.breakdown.map((row) => row.amount)).toEqual([
      '0.000012596742639926 WETH',
      '0.000039149019334238 WETH',
      '0.001369941633563023 WETH'
    ])
    expect(result.breakdown.map((row) => row.label)).toEqual([
      'Better-price fee',
      'Volume-based fee (0.02%)',
      'Volume-based fee (0.7%)'
    ])
    expect(result.reason).toBeUndefined()
    expect(result.totals[0]!.compactAmount).toBe('3.87 USDC')
    expect(result.breakdown[0]!.description).toContain('reference quote')
    expect(journal).toEqual(before)
  })
  it('values each fee line at the price before fees so the lines add up to the total', () => {
    const { target, execution, order, trade } = swapFeeFixture()
    const result = presentSwapFees(target, verifyCowFees(target, execution, [order], [trade]))
    expect(result.breakdown.map((row) => row.equivalent)).toEqual([
      '≈ 0.03 USDC',
      '≈ 0.11 USDC',
      '≈ 3.73 USDC'
    ])
    expect(result.breakdownTotal).toMatchObject({
      compactAmount: '0.00142169 WETH',
      equivalent: '≈ 3.87 USDC'
    })
    expect(result.withheld).toBe(
      'Withheld from the WETH received: 0.194336 WETH arrived instead of 0.195758 WETH.'
    )
  })
  it('says nothing about the books for a swap the journal does not hold', () => {
    const { target, journal } = swapFeeFixture()
    expect(swapBooking([], target)).toBeUndefined()
    expect(swapBooking([journal], target)).toBeUndefined()
  })
  it('keeps positive tiny fees distinct from zero and preserves unknown token units', () => {
    expect(swapFeeAmount('1', 'WETH', 18, 8)).toBe('< 0.00000001 WETH')
    expect(swapFeeAmount('0', 'WETH', 18, 8)).toBe('0 WETH')
    expect(swapFeeAmount('1', 'WETH', 18)).toBe('0.000000000000000001 WETH')
    expect(swapFeeAmount('1234', 'TOKEN', null, 2)).toBe('1234 base units (TOKEN)')
    expect(swapFeeAmount('1421687395537187', 'WETH', 18, 2)).toBe('0.00142169 WETH')
  })
  it('names a fee in an unknown denomination by its token address', () => {
    const { target } = swapFeeFixture()
    const result = presentSwapFees(target, {
      fees: [{ tokenAddress: ADDR.founder, rawAmount: '1234' }],
      protocolFees: []
    })
    expect(result.totals[0]!.amount).toBe(`1234 base units (${ADDR.founder})`)
  })
})
