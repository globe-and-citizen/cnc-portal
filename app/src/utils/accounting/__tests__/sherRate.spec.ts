import { describe, it, expect } from 'vitest'
import {
  buildSherMultiplierTimeline,
  makeSherUsdRate,
  resolveCurrentSherMultiplier,
  currentSherUsdRate,
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

describe('makeSherUsdRate (per-date timeline — freezes a leg at its own date)', () => {
  it('returns null only for a truly empty timeline (defensive)', () => {
    expect(makeSherUsdRate([])).toBeNull()
  })

  it('defaults to the 1x multiplier (1 SHER = $1) when nothing is known', () => {
    const rate = makeSherUsdRate(buildSherMultiplierTimeline(undefined, undefined))!
    expect(rate(new Date(1_000 * 1000))).toBeCloseTo(1)
  })

  it('values 1 SHER as 1 / multiplier', () => {
    const points: SherMultiplierPoint[] = [{ timestamp: 0, multiplier: 2 }]
    const rate = makeSherUsdRate(points)!
    expect(rate(new Date(1_000 * 1000))).toBeCloseTo(0.5) // 2x → $0.50 / SHER
  })

  it('uses the multiplier in effect on the entry date (historised, frozen per date)', () => {
    // 1x until t=100, then 4x from t=100 onward.
    const timeline = buildSherMultiplierTimeline([update(100, 1, 4)], undefined)
    const rate = makeSherUsdRate(timeline)!
    expect(rate(new Date(50 * 1000))).toBeCloseTo(1) // before the change: 1x → $1.00
    expect(rate(new Date(150 * 1000))).toBeCloseTo(0.25) // after the change: 4x → $0.25
  })

  it('defends dates before the first change against a malformed oldMultiplier', () => {
    const rows = [{ ...update(100, 1, 4), oldMultiplier: '' }]
    const rate = makeSherUsdRate(buildSherMultiplierTimeline(rows, undefined))!
    expect(rate(new Date(50 * 1000))).toBeCloseTo(1) // 1x default, not $0
    expect(rate(new Date(150 * 1000))).toBeCloseTo(0.25) // the event still applies
  })

  it('falls back to the multiplier implied by a USD-pegged deposit', () => {
    const timeline = buildSherMultiplierTimeline([], [deposit(10, 100, 200)])
    const rate = makeSherUsdRate(timeline)!
    expect(rate(new Date(20 * 1000))).toBeCloseTo(0.5) // 100 USDC → 200 SHER → 2x → $0.50
  })
})

describe('resolveCurrentSherMultiplier (the rate pending accruals float at)', () => {
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
})

describe('currentSherUsdRate', () => {
  it('is 1 / current multiplier', () => {
    expect(currentSherUsdRate([update(100, 1, 5)], undefined, null)).toBeCloseTo(0.2) // 5x
    expect(currentSherUsdRate(undefined, undefined, 4)).toBeCloseTo(0.25) // live 4x
  })
})
