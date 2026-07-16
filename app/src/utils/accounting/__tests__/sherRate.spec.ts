import { describe, it, expect } from 'vitest'
import {
  buildSherMultiplierTimeline,
  makeSherUsdRate,
  type SherMultiplierPoint
} from '@/utils/accounting/sherRate'
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

describe('makeSherUsdRate', () => {
  it('returns null only for a truly empty timeline (defensive)', () => {
    expect(makeSherUsdRate([])).toBeNull()
  })

  it('defaults to the 1x multiplier (1 SHER = $1) when nothing is known', () => {
    const rate = makeSherUsdRate(buildSherMultiplierTimeline(undefined, undefined))!
    expect(rate(new Date(1_000 * 1000))).toBeCloseTo(1)
  })

  it('uses the live contract multiplier when there are no change events', () => {
    const rate = makeSherUsdRate(buildSherMultiplierTimeline(undefined, undefined, 4))!
    expect(rate(new Date(1_000 * 1000))).toBeCloseTo(0.25) // 4x → $0.25 / SHER
  })

  it('prefers the live contract multiplier over the deposit-implied fallback', () => {
    const rate = makeSherUsdRate(buildSherMultiplierTimeline([], [deposit(10, 100, 200)], 5))!
    expect(rate(new Date(20 * 1000))).toBeCloseTo(0.2) // 5x live, not 2x deposit-implied
  })

  it('values 1 SHER as 1 / multiplier', () => {
    const points: SherMultiplierPoint[] = [{ timestamp: 0, multiplier: 2 }]
    const rate = makeSherUsdRate(points)!
    expect(rate(new Date(1_000 * 1000))).toBeCloseTo(0.5) // multiplier 2x → $0.50 / SHER
  })

  it('defends dates before the first change against a malformed oldMultiplier', () => {
    const rows = [{ ...update(100, 1, 4), oldMultiplier: '' }]
    const rate = makeSherUsdRate(buildSherMultiplierTimeline(rows, undefined))!
    expect(rate(new Date(50 * 1000))).toBeCloseTo(1) // 1x default, not $0
    expect(rate(new Date(150 * 1000))).toBeCloseTo(0.25) // the event still applies
  })

  it('uses the multiplier in effect on the entry date (historised, frozen per date)', () => {
    // 1x until t=100, then 4x from t=100 onward.
    const timeline = buildSherMultiplierTimeline([update(100, 1, 4)], undefined)
    const rate = makeSherUsdRate(timeline)!
    expect(rate(new Date(50 * 1000))).toBeCloseTo(1) // before the change: 1x → $1.00
    expect(rate(new Date(150 * 1000))).toBeCloseTo(0.25) // after the change: 4x → $0.25
  })

  it('falls back to the multiplier implied by a USD-pegged deposit', () => {
    const timeline = buildSherMultiplierTimeline([], [deposit(10, 100, 200)])
    const rate = makeSherUsdRate(timeline)!
    expect(rate(new Date(20 * 1000))).toBeCloseTo(0.5) // 100 USDC → 200 SHER → 2x → $0.50
  })

  it('prefers the change events over the deposit-implied fallback', () => {
    const timeline = buildSherMultiplierTimeline([update(100, 1, 5)], [deposit(10, 100, 200)])
    const rate = makeSherUsdRate(timeline)!
    expect(rate(new Date(200 * 1000))).toBeCloseTo(0.2) // 5x from the event, not 2x from the deposit
  })
})
