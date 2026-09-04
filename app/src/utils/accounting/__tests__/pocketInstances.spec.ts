import { describe, it, expect } from 'vitest'
import { buildPocketInstances, NO_POCKET_INSTANCES } from '../pocketInstances'
import type { LedgerEntry } from '../ledgerEntry'

const BANK_1 = '0x1111111111111111111111111111111111111111'
const BANK_2 = '0x2222222222222222222222222222222222222222'

/** A deposit into one Bank contract at a given time. */
function deposit(
  id: string,
  instance: string | undefined,
  timestamp: number,
  account: LedgerEntry['debit'] = 'Cash — Bank'
): LedgerEntry {
  return {
    id,
    timestamp,
    useCase: 'UC-BANK-02',
    debit: account,
    ...(instance ? { debitInstance: instance as `0x${string}` } : {}),
    credit: 'Service Revenue',
    amountUsd: 100,
    token: 'usdc',
    rawAmount: '100000000',
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  }
}

describe('pocket instances (redeploy numbering)', () => {
  it('numbers a redeployed pocket oldest-first, leaving the original un-numbered', () => {
    const index = buildPocketInstances([
      deposit('b', BANK_2, 30), // the newer contract, seen first in the feed
      deposit('a', BANK_1, 10)
    ])

    expect(index.isSplit('Cash — Bank')).toBe(true)
    expect(index.labelOf('Cash — Bank', BANK_1)).toBe('Cash — Bank')
    expect(index.labelOf('Cash — Bank', BANK_2)).toBe('Cash — Bank 2')
    expect(index.instanceOf('Cash — Bank', BANK_1)?.number).toBe(1)
    expect(index.instanceOf('Cash — Bank', BANK_2)?.number).toBe(2)
    expect(index.instancesOf('Cash — Bank').map((i) => i.instance)).toEqual([BANK_1, BANK_2])
  })

  it('orders on first activity, not on the address', () => {
    // BANK_2 moved first, so it is the original deployment however it sorts.
    const index = buildPocketInstances([deposit('a', BANK_2, 5), deposit('b', BANK_1, 50)])
    expect(index.labelOf('Cash — Bank', BANK_2)).toBe('Cash — Bank')
    expect(index.labelOf('Cash — Bank', BANK_1)).toBe('Cash — Bank 2')
  })

  it('reads a leg back whatever the address casing', () => {
    const index = buildPocketInstances([deposit('a', BANK_1, 10), deposit('b', BANK_2, 20)])
    expect(index.labelOf('Cash — Bank', BANK_2.toUpperCase().replace('0X', '0x'))).toBe(
      'Cash — Bank 2'
    )
  })

  it('leaves an un-instanced leg on the plain account name', () => {
    // The legacy LedgerEntry display index has no concrete account identity for a
    // leg with no contract address, so it leaves the family name plain here.
    const index = buildPocketInstances([
      deposit('a', BANK_1, 10),
      deposit('b', BANK_2, 20),
      deposit('c', undefined, 30)
    ])
    expect(index.labelOf('Cash — Bank', undefined)).toBe('Cash — Bank')
    expect(index.instanceOf('Cash — Bank', undefined)).toBeUndefined()
  })

  it('keeps a never-redeployed pocket un-numbered', () => {
    const index = buildPocketInstances([deposit('a', BANK_1, 10), deposit('b', BANK_1, 20)])
    expect(index.isSplit('Cash — Bank')).toBe(false)
    expect(index.labelOf('Cash — Bank', BANK_1)).toBe('Cash — Bank')
    expect(index.instanceOf('Cash — Bank', BANK_1)).toBeUndefined()
  })

  it('never numbers an account that is not an instanced pocket', () => {
    // Safe keeps its address across redeploys, so two addresses are still one Safe.
    const index = buildPocketInstances([
      deposit('a', BANK_1, 10, 'Cash — Safe'),
      deposit('b', BANK_2, 20, 'Cash — Safe')
    ])
    expect(index.isSplit('Cash — Safe')).toBe(false)
    expect(index.labelOf('Cash — Safe', BANK_2)).toBe('Cash — Safe')
    expect(index.instancesOf('Cash — Safe')).toEqual([])
  })

  it('numbers each pocket on its own', () => {
    const index = buildPocketInstances([
      deposit('a', BANK_1, 10),
      deposit('b', BANK_2, 20),
      deposit('c', BANK_1, 30, 'Cash — Payroll')
    ])
    expect(index.labelOf('Cash — Bank', BANK_2)).toBe('Cash — Bank 2')
    expect(index.labelOf('Cash — Payroll', BANK_1)).toBe('Cash — Payroll')
  })

  it('reads every account plainly on an empty index', () => {
    expect(NO_POCKET_INSTANCES.labelOf('Cash — Bank', BANK_2)).toBe('Cash — Bank')
    expect(NO_POCKET_INSTANCES.isSplit('Cash — Bank')).toBe(false)
    expect(NO_POCKET_INSTANCES.labelOf(null)).toBe('')
  })
})
