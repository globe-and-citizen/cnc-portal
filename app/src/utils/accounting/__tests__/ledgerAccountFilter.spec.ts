import { describe, it, expect } from 'vitest'
import { ledgerAccounts, filterLedgerByAccount } from '@/utils/accounting/ledgerPresenter'
import { buildPocketInstances } from '@/utils/accounting/pocketInstances'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** A minimal posting — only the legs the filter keys off. */
function entry(id: string, debit: string | null, credit: string | null): LedgerEntry {
  return {
    id,
    timestamp: 1,
    useCase: 'INTERNAL',
    debit: debit ?? undefined,
    credit: credit ?? undefined,
    amountUsd: 1,
    token: 'usdc',
    rawAmount: '1000000',
    memo: '',
    enrichment: 'not-applicable'
  }
}

const wage = entry('a', 'Wages Expense', 'Wages Payable')
const payroll = entry('b', 'Wages Payable', 'Cash — Payroll')
const bank = entry('c', 'Cash — Payroll', 'Cash — Bank')
const memo = entry('d', null, null) // a memo posting touches no account
const feed = [wage, payroll, bank, memo]

describe('ledgerAccounts', () => {
  it('lists the distinct real accounts on either leg, A–Z, memo excluded', () => {
    expect(ledgerAccounts(feed)).toEqual([
      'Cash — Bank',
      'Cash — Payroll',
      'Wages Expense',
      'Wages Payable'
    ])
  })
})

describe('filterLedgerByAccount', () => {
  it('keeps whole postings that touch the account on the debit leg', () => {
    // "Wages Expense" is a debit on `wage` only.
    expect(filterLedgerByAccount(feed, ['Wages Expense']).map((e) => e.id)).toEqual(['a'])
  })

  it('keeps postings that touch the account on either leg', () => {
    // "Wages Payable" credits `wage` and debits `payroll`.
    expect(filterLedgerByAccount(feed, ['Wages Payable']).map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('unions several selected accounts', () => {
    const ids = filterLedgerByAccount(feed, ['Wages Expense', 'Cash — Bank']).map((e) => e.id)
    expect(ids).toEqual(['a', 'c'])
  })

  it('drops postings that touch none of the accounts (and the memo)', () => {
    expect(filterLedgerByAccount(feed, ['Nonexistent'])).toHaveLength(0)
  })
})

// A redeployed cash pocket: the filter lists — and narrows by — each deployment
// under its numbered label, so a user can isolate just "Cash — Bank 2".
describe('account filter across a redeployed pocket', () => {
  const BANK_1 = '0x1111111111111111111111111111111111111111'
  const BANK_2 = '0x2222222222222222222222222222222222222222'

  /** A deposit into one Bank deployment at a given time. */
  function deposit(id: string, instance: string, timestamp: number): LedgerEntry {
    return {
      id,
      timestamp,
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      debitInstance: instance as `0x${string}`,
      credit: 'Service Revenue',
      amountUsd: 1,
      token: 'usdc',
      rawAmount: '1000000',
      memo: '',
      enrichment: 'not-applicable'
    }
  }

  const redeployed = [deposit('d1', BANK_1, 1_700_000_000), deposit('d2', BANK_2, 1_700_086_400)]
  const instances = buildPocketInstances(redeployed)

  it('lists each deployment under its numbered label', () => {
    expect(ledgerAccounts(redeployed, instances)).toEqual([
      'Cash — Bank',
      'Cash — Bank 2',
      'Service Revenue'
    ])
  })

  it('sorts numbered deployments numerically (2 before 10)', () => {
    const many = [
      deposit('a', BANK_1, 1),
      deposit('b', BANK_2, 2),
      deposit('c', '0x3333333333333333333333333333333333333333', 3),
      deposit('d', '0x4444444444444444444444444444444444444444', 4),
      deposit('e', '0x5555555555555555555555555555555555555555', 5),
      deposit('f', '0x6666666666666666666666666666666666666666', 6),
      deposit('g', '0x7777777777777777777777777777777777777777', 7),
      deposit('h', '0x8888888888888888888888888888888888888888', 8),
      deposit('i', '0x9999999999999999999999999999999999999999', 9),
      deposit('j', '0xaaaAaAAaAAAAAaaAaaAAaAaaAaAAAaaAAaAaAaAA', 10)
    ]
    const idx = buildPocketInstances(many)
    const labels = ledgerAccounts(many, idx).filter((a) => a.startsWith('Cash — Bank'))
    expect(labels[1]).toBe('Cash — Bank 2')
    expect(labels[labels.length - 1]).toBe('Cash — Bank 10')
  })

  it('narrows to a single chosen deployment', () => {
    expect(
      filterLedgerByAccount(redeployed, ['Cash — Bank 2'], instances).map((e) => e.id)
    ).toEqual(['d2'])
    expect(filterLedgerByAccount(redeployed, ['Cash — Bank'], instances).map((e) => e.id)).toEqual([
      'd1'
    ])
  })

  it('lists the plain account name without an index (back-compat)', () => {
    expect(ledgerAccounts(redeployed)).toEqual(['Cash — Bank', 'Service Revenue'])
  })
})
