import { describe, expect, it } from 'vitest'
import {
  getCreditWhitelistAllocationSummary,
  isCreditWhitelistEntryUncapped,
  sumWhitelistAmountUnits,
  toCreditCallOfferParams,
  UNCAPPED_ALLOCATION
} from '../communityCreditUtil'
import type { CreditWhitelistEntry, CreditOfferForm } from '@/types'

function baseForm(overrides: Partial<CreditOfferForm> = {}): CreditOfferForm {
  return {
    title: 'Round',
    purpose: '',
    principal: 100000,
    rate: 6,
    termValue: 90,
    termUnit: 'days',
    deadline: '2026-06-30',
    deadlineTime: '23:59',
    access: 'whitelist',
    capOn: false,
    cap: 0,
    token: 'USDC',
    ...overrides
  }
}

describe('UNCAPPED_ALLOCATION', () => {
  it('matches FixedReturn.sol UNCAPPED_ALLOCATION (type(uint256).max)', () => {
    expect(UNCAPPED_ALLOCATION).toBe(2n ** 256n - 1n)
  })
})

describe('isCreditWhitelistEntryUncapped', () => {
  it('is true when the amount is unset — the only way an entry is uncapped now', () => {
    expect(isCreditWhitelistEntryUncapped({ username: '@a', address: '0x1', amount: null })).toBe(
      true
    )
  })

  it('is false for a capped entry with a real amount', () => {
    expect(isCreditWhitelistEntryUncapped({ username: '@a', address: '0x1', amount: 5000 })).toBe(
      false
    )
  })
})

describe('sumWhitelistAmountUnits', () => {
  it('scales and sums each amount independently, matching how the contract totals allocations', () => {
    const whitelist = [{ amount: 60000 }, { amount: 40000 }]
    expect(sumWhitelistAmountUnits(whitelist, 6)).toBe(100000_000000n)
  })

  it('treats an unset amount as contributing zero', () => {
    const whitelist = [{ amount: 60000 }, { amount: null }]
    expect(sumWhitelistAmountUnits(whitelist, 6)).toBe(60000_000000n)
  })

  it('rounds each amount to its smallest unit independently, not the pre-summed float', () => {
    // 3 * 3.3333333 rounds per-entry to 3333333n each (parseUnits rounds the 7th decimal
    // digit), summing to 9999999n — one unit short of 10_000000n, even though the raw
    // float sum (9.9999999) looks "close enough" to 10.
    const whitelist = [{ amount: 3.3333333 }, { amount: 3.3333333 }, { amount: 3.3333333 }]
    expect(sumWhitelistAmountUnits(whitelist, 6)).toBe(9999999n)
  })

  it('respects the given decimals', () => {
    const whitelist = [{ amount: 1.5 }]
    expect(sumWhitelistAmountUnits(whitelist, 2)).toBe(150n)
    expect(sumWhitelistAmountUnits(whitelist, 6)).toBe(1500000n)
  })
})

describe('toCreditCallOfferParams', () => {
  it('scales a capped entry amount the same way toFixedReturnOfferParams does', () => {
    const whitelist: CreditWhitelistEntry[] = [
      { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: 100000 }
    ]
    const params = toCreditCallOfferParams(baseForm(), whitelist)
    expect(params.allocations).toEqual([100000_000000n])
  })

  it('maps an entry left with no amount to UNCAPPED_ALLOCATION — the no-cap-round case', () => {
    const whitelist: CreditWhitelistEntry[] = [
      { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: null }
    ]
    const params = toCreditCallOfferParams(baseForm(), whitelist)
    expect(params.allocations).toEqual([UNCAPPED_ALLOCATION])
  })

  it('maps every entry to UNCAPPED_ALLOCATION when none have an amount', () => {
    const whitelist: CreditWhitelistEntry[] = [
      { username: '@a', address: '0x1111111111111111111111111111111111111111', amount: null },
      { username: '@b', address: '0x2222222222222222222222222222222222222222', amount: null }
    ]
    const params = toCreditCallOfferParams(baseForm(), whitelist)
    expect(params.allocations).toEqual([UNCAPPED_ALLOCATION, UNCAPPED_ALLOCATION])
  })
})

describe('getCreditWhitelistAllocationSummary', () => {
  it('reports exact when capped allocations equal the target', () => {
    const whitelist: CreditWhitelistEntry[] = [{ username: '@a', address: '0x1', amount: 100000 }]
    expect(getCreditWhitelistAllocationSummary(whitelist, 100000).status).toBe('exact')
  })

  it('reports under when the capped sum falls short of the target', () => {
    const whitelist: CreditWhitelistEntry[] = [{ username: '@a', address: '0x1', amount: 60000 }]
    const summary = getCreditWhitelistAllocationSummary(whitelist, 100000)
    expect(summary.status).toBe('under')
    expect(summary.description).toContain('short')
  })

  it('reports over as a deliberate, publishable buffer — not an error condition', () => {
    // Post-acceptPartialFunding, FixedReturn.sol allows capped allocations to sum above
    // the target (only below-target still blocks createLendingOffer), since the extra
    // is a buffer against a whitelisted lender who doesn't end up depositing.
    const whitelist: CreditWhitelistEntry[] = [{ username: '@a', address: '0x1', amount: 120000 }]
    const summary = getCreditWhitelistAllocationSummary(whitelist, 100000)
    expect(summary.status).toBe('over')
    expect(summary.description).toContain('over')
    expect(summary.description).toContain('buffer')
  })
})
