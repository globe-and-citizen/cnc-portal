import { describe, expect, it } from 'vitest'
import { createCreditCallAccessSchema } from '../communityCredit.schemas'

function baseAccessData(overrides: Record<string, unknown> = {}) {
  return {
    access: 'restricted' as const,
    whitelist: [] as { username: string; address: string; amount: number | null }[],
    capOn: true,
    cap: 10,
    ...overrides
  }
}

describe('createCreditCallAccessSchema — whitelist sum vs. target (bigint, at-least)', () => {
  it('passes when the sum matches the target exactly at the token decimals', () => {
    const schema = createCreditCallAccessSchema({ target: 100, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 100,
        whitelist: [
          { username: '@a', address: '0x1', amount: 60 },
          { username: '@b', address: '0x2', amount: 40 }
        ]
      })
    )
    expect(result.success).toBe(true)
  })

  it('rejects a sum that is a genuine smallest-unit short of the target, even when float arithmetic makes it look close enough', () => {
    // 3 lenders at 3.3333333 (7 decimal places) sum to 9.9999999 in float terms — within
    // the old 1e-6 tolerance of a 10 target. But FixedReturn.sol scales *each* amount to
    // its 6-decimal smallest unit independently (parseUnits rounds 3.3333333 -> 3333333)
    // and sums those as integers: 3 * 3333333 = 9999999, one unit short of 10_000000.
    // The old float check would have let this through and then reverted on-chain with
    // AllocationSumBelowFundingTarget; the bigint-exact check must reject it up front.
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 10,
        whitelist: [
          { username: '@a', address: '0x1', amount: 3.3333333 },
          { username: '@b', address: '0x2', amount: 3.3333333 },
          { username: '@c', address: '0x3', amount: 3.3333333 }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const whitelistIssue = result.error.issues.find((issue) => issue.path[0] === 'whitelist')
      expect(whitelistIssue?.message).toContain('must add up to at least the target amount')
    }
  })

  it('respects a different token decimals when comparing the sum to the target', () => {
    // At 2 decimals, 33.33 + 33.33 + 33.34 lands exactly on 100.00 — passes.
    const schema = createCreditCallAccessSchema({ target: 100, decimals: 2 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 100,
        whitelist: [
          { username: '@a', address: '0x1', amount: 33.33 },
          { username: '@b', address: '0x2', amount: 33.33 },
          { username: '@c', address: '0x3', amount: 33.34 }
        ]
      })
    )
    expect(result.success).toBe(true)
  })

  it('defaults to 6 decimals when none is provided', () => {
    const schema = createCreditCallAccessSchema({ target: 100 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 100,
        whitelist: [{ username: '@a', address: '0x1', amount: 100 }]
      })
    )
    expect(result.success).toBe(true)
  })

  it('allows a sum that exceeds the target, as a deliberate buffer against a lender not depositing', () => {
    const schema = createCreditCallAccessSchema({ target: 100, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 100,
        whitelist: [{ username: '@a', address: '0x1', amount: 100.000001 }]
      })
    )
    expect(result.success).toBe(true)
  })
})

describe('createCreditCallAccessSchema — per-lender amount must be positive', () => {
  it('rejects a negative lender amount, even when the sum still nets out to the target', () => {
    // A negative amount could otherwise cancel out a larger positive one and still land
    // exactly on the target sum — the positivity check must catch it independently of
    // the sum-vs-target checks, since a negative allocation can't be encoded on-chain
    // (allocations are uint256) and would only surface as a low-level revert otherwise.
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 15,
        whitelist: [
          { username: '@a', address: '0x1', amount: 15 },
          { username: '@b', address: '0x2', amount: -5 }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const whitelistIssue = result.error.issues.find((issue) => issue.path[0] === 'whitelist')
      expect(whitelistIssue?.message).toContain('greater than zero')
    }
  })

  it('rejects a zero lender amount', () => {
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 10,
        whitelist: [{ username: '@a', address: '0x1', amount: 0 }]
      })
    )
    expect(result.success).toBe(false)
  })

  it('still allows a null amount, since capOn: false leaves every lender uncapped', () => {
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        capOn: false,
        cap: undefined,
        whitelist: [{ username: '@a', address: '0x1', amount: null }]
      })
    )
    expect(result.success).toBe(true)
  })
})

describe('createCreditCallAccessSchema — whitelist addresses must be unique', () => {
  it('rejects a whitelist with the same address twice', () => {
    // Mirrors FixedReturn.sol's DuplicateWhitelistAddress — a repeated address would
    // silently overwrite its earlier allocation on-chain while the exact-sum check
    // above still counts both amounts, so this must be caught before submission.
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 10,
        whitelist: [
          { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: 6 },
          { username: '@a-again', address: '0x1111111111111111111111111111111111111111', amount: 4 }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const whitelistIssue = result.error.issues.find((issue) => issue.path[0] === 'whitelist')
      expect(whitelistIssue?.message).toContain('can only appear once')
    }
  })

  it('rejects a duplicate that only differs by address checksum case', () => {
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 10,
        whitelist: [
          { username: '@a', address: '0xAbC1111111111111111111111111111111111111', amount: 6 },
          { username: '@a-again', address: '0xabc1111111111111111111111111111111111111', amount: 4 }
        ]
      })
    )
    expect(result.success).toBe(false)
  })

  it('allows distinct addresses', () => {
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        cap: 10,
        whitelist: [
          { username: '@a', address: '0x1', amount: 6 },
          { username: '@b', address: '0x2', amount: 4 }
        ]
      })
    )
    expect(result.success).toBe(true)
  })

  it('rejects a duplicate address even in uncapped mode (capOn: false)', () => {
    // The dedup rule isn't gated on capOn — a duplicate is still a distinct on-chain
    // problem (DuplicateWhitelistAddress) regardless of whether amounts are set.
    const schema = createCreditCallAccessSchema({ target: 10, decimals: 6 })
    const result = schema.safeParse(
      baseAccessData({
        capOn: false,
        cap: undefined,
        whitelist: [
          { username: '@a', address: '0x1', amount: null },
          { username: '@a-again', address: '0x1', amount: null }
        ]
      })
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      const whitelistIssue = result.error.issues.find((issue) => issue.path[0] === 'whitelist')
      expect(whitelistIssue?.message).toContain('can only appear once')
    }
  })
})
