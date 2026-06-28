import { describe, it, expect, vi } from 'vitest'
import { isUsdPegged, requireRateOfRecord, toUsd, type UsdRateOfRecord } from '../toUsd'
import type { TokenId } from '@/constant'

const AT = new Date('2026-03-13T00:00:00Z')

describe('isUsdPegged', () => {
  it('flags the stablecoins and nothing else', () => {
    expect(isUsdPegged('usdc')).toBe(true)
    expect(isUsdPegged('usdc.e')).toBe(true)
    expect(isUsdPegged('usdt')).toBe(true)
    expect(isUsdPegged('native')).toBe(false)
    expect(isUsdPegged('sher')).toBe(false)
  })
})

describe('toUsd', () => {
  it('normalizes stablecoins by their 6 decimals at the $1 peg, ignoring the resolver', () => {
    const rate = vi.fn<UsdRateOfRecord>()
    expect(toUsd(1_000_000n, 'usdc', AT, rate)).toBe(1)
    expect(toUsd(2_500_000n, 'usdt', AT, rate)).toBe(2.5)
    expect(toUsd(49_800_000n, 'usdc.e', AT, rate)).toBeCloseTo(49.8, 10)
    expect(rate).not.toHaveBeenCalled()
  })

  it('normalizes native (POL/ETH) by 18 decimals times the rate of record', () => {
    const rate: UsdRateOfRecord = () => 0.5
    // 22 POL at $0.5 → $11
    expect(toUsd(22_000000000000000000n, 'native', AT, rate)).toBeCloseTo(11, 10)
  })

  it('normalizes SHER by 6 decimals times the agreed mint price', () => {
    const mintPrice: UsdRateOfRecord = () => 1
    // 10 SHER at $1 → $10
    expect(toUsd(10_000_000n, 'sher', AT, mintPrice)).toBe(10)
  })

  it('passes the token id and tx date through to the resolver', () => {
    const rate = vi.fn<UsdRateOfRecord>(() => 2)
    toUsd(1_000000000000000000n, 'native', AT, rate)
    expect(rate).toHaveBeenCalledWith('native', AT)
  })

  it('returns zero for a zero amount without consulting the resolver', () => {
    const rate = vi.fn<UsdRateOfRecord>(() => 1234)
    expect(toUsd(0n, 'native', AT, rate)).toBe(0)
  })

  it('throws via the default resolver for tokens with no price feed yet', () => {
    const unfed: TokenId[] = ['native', 'sher']
    unfed.forEach((tokenId) => {
      expect(() => toUsd(1n, tokenId, AT)).toThrow(/rate-of-record/)
    })
  })

  it('default resolver always throws (only reached for non-pegged tokens)', () => {
    expect(() => requireRateOfRecord('native', AT)).toThrow()
  })
})
