import { describe, it, expect } from 'vitest'
import { ledgerAccounts, filterLedgerByAccount } from '@/utils/accounting/ledgerPresenter'
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
