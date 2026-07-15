import { describe, it, expect } from 'vitest'
import { resolveCurrentSherMultiplier, currentSherUsdRate } from '@/utils/accounting/sherRate'
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
  it('defaults to the 1x multiplier when nothing is known', () => {
    expect(resolveCurrentSherMultiplier(undefined, undefined)).toBe(1)
  })

  it('uses the live contract multiplier when provided', () => {
    expect(resolveCurrentSherMultiplier(undefined, undefined, 4)).toBe(4)
  })

  it('prefers the live multiplier over the change events and the deposit fallback', () => {
    expect(resolveCurrentSherMultiplier([update(100, 1, 5)], [deposit(10, 100, 200)], 8)).toBe(8)
  })

  it('uses the most recent change event when there is no live read', () => {
    // Latest event wins regardless of order — 1x→4x then 4x→6x → current is 6x.
    expect(resolveCurrentSherMultiplier([update(200, 4, 6), update(100, 1, 4)], undefined)).toBe(6)
  })

  it('falls back to the multiplier implied by a USD-pegged deposit', () => {
    // 100 USDC minted 200 SHER → 2x.
    expect(resolveCurrentSherMultiplier([], [deposit(10, 100, 200)])).toBe(2)
  })
})

describe('currentSherUsdRate', () => {
  it('values 1 SHER as 1 / current multiplier', () => {
    expect(currentSherUsdRate(undefined, undefined, 5)).toBeCloseTo(0.2) // 5x → $0.20 / SHER
  })

  it('is 1 SHER = $1 at the 1x default', () => {
    expect(currentSherUsdRate(undefined, undefined)).toBeCloseTo(1)
  })

  it('ignores the entry date — every SHER leg is valued at the current multiplier', () => {
    // Even with an old 1x→5x change, the current (latest) 5x rate applies to all dates.
    const rate = currentSherUsdRate([update(100, 1, 5)], undefined)
    expect(rate).toBeCloseTo(0.2)
  })
})
