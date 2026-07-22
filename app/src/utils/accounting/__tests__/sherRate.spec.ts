import { describe, it, expect } from 'vitest'
import { resolveCurrentSherMultiplier, makeSherUsdRate } from '@/utils/accounting/sherRate'
import { USDC_ADDRESS } from '@/constant'
import type { SafeMultiplierUpdatedRow, SafeDepositRow } from '@/types/ponder/investor'

/** A `MultiplierUpdated` row (multipliers in 6-decimal base units). */
function update(timestamp: number, oldX: number, newX: number): SafeMultiplierUpdatedRow {
  return {
    id: `m-${timestamp}`,
    contractAddress: '0xrouter',
    oldMultiplier: String(Math.round(oldX * 1e6)),
    newMultiplier: String(Math.round(newX * 1e6)),
    timestamp
  } as SafeMultiplierUpdatedRow
}

/** A USDC `Deposited` row: `tokenAmount` (6 dp) → `sherAmount` (6 dp). */
function deposit(timestamp: number, usdc: number, sher: number): SafeDepositRow {
  return {
    id: `d-${timestamp}`,
    contractAddress: '0xrouter',
    depositor: '0xinvestor',
    token: USDC_ADDRESS,
    tokenAmount: String(Math.round(usdc * 1e6)),
    sherAmount: String(Math.round(sher * 1e6)),
    timestamp
  } as SafeDepositRow
}

describe('resolveCurrentSherMultiplier', () => {
  it('prefers the router live read over every fallback', () => {
    expect(
      resolveCurrentSherMultiplier([update(100, 1, 4)], [deposit(10, 100, 200)], 5)
    ).toBeCloseTo(5)
  })

  it('falls back to the most recent change event when there is no live read', () => {
    const events = [update(100, 1, 4), update(200, 4, 6)]
    expect(resolveCurrentSherMultiplier(events, undefined, null)).toBeCloseTo(6)
  })

  it('falls back to a USD-pegged deposit when there are no events or live read', () => {
    expect(resolveCurrentSherMultiplier([], [deposit(10, 100, 200)], null)).toBeCloseTo(2)
  })

  it('defaults to the 1x multiplier when nothing is known', () => {
    expect(resolveCurrentSherMultiplier(undefined, undefined)).toBeCloseTo(1)
  })

  it('defends against a malformed latest event by falling through to the default', () => {
    const events = [{ ...update(100, 1, 4), newMultiplier: '' }]
    expect(resolveCurrentSherMultiplier(events, undefined, null)).toBeCloseTo(1)
  })
})

describe('makeSherUsdRate', () => {
  it('values 1 SHER as 1 / multiplier, identically on every date', () => {
    const rate = makeSherUsdRate(2)!
    expect(rate(new Date(0))).toBeCloseTo(0.5) // 2x → $0.50 / SHER
    expect(rate(new Date(9_999_999_000))).toBeCloseTo(0.5) // date-independent
  })

  it('returns null for a non-positive multiplier (defensive)', () => {
    expect(makeSherUsdRate(0)).toBeNull()
    expect(makeSherUsdRate(-1)).toBeNull()
  })
})
