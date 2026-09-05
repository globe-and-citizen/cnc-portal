import { describe, it, expect } from 'vitest'
import { badgeClassOf, categoryOf, categoryLabelOf } from '@/utils/accounting/ledgerCategory'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry, UseCase } from '@/utils/accounting/ledgerEntry'

const base = {
  id: 'e1',
  timestamp: 1_700_000_000,
  debit: 'Cash — Credit' as const,
  credit: 'Loan Payable' as const,
  amountUsd: 100,
  token: 'usdc' as const,
  rawAmount: '100000000',
  memo: '',
  internal: false,
  enrichment: 'not-applicable' as const
}

const entry = (useCase: UseCase, over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  useCase,
  ...over
})

describe('categoryOf', () => {
  it('gathers the whole borrowing lifecycle under the Credit pill, bar the sweep', () => {
    expect(categoryOf(entry('UC-CREDIT-01'))).toBe('Credit')
    expect(categoryOf(entry('UC-CREDIT-03'))).toBe('Credit')
    expect(categoryOf(entry('UC-CREDIT-04'))).toBe('Credit')
    // The funded-offer sweep moves money between two CNC pockets.
    expect(categoryOf(entry('UC-CREDIT-02'))).toBe('Transfer')
  })

  it('files a direct treasury deposit under Revenue', () => {
    expect(categoryOf(entry('UC-BANK-02'))).toBe('Revenue')
  })

  it('lets a manual classification drive the badge, not the CASH-IN/OUT use case', () => {
    // Owner's deliberate call wins over the generic collapsed use case.
    expect(categoryOf(entry('CASH-IN', { classified: 'OWNER_CAPITAL' }))).toBe('Investment')
    expect(categoryOf(entry('CASH-IN', { classified: 'REVENUE' }))).toBe('Revenue')
    expect(categoryOf(entry('CASH-OUT', { classified: 'PAYROLL_EXPENSE' }))).toBe('Payroll')
    expect(categoryOf(entry('CASH-OUT', { classified: 'INTEREST_EXPENSE' }))).toBe('Credit')
    expect(categoryOf(entry('CASH-OUT', { classified: 'DIVIDEND_EXPENSE' }))).toBe('Dividend')
    // An unclassified inflow keeps the plain Revenue category.
    expect(categoryOf(entry('CASH-IN'))).toBe('Revenue')
  })

  it('falls back to Transfer for an unmapped use case', () => {
    expect(categoryOf(entry('UC-UNKNOWN' as UseCase))).toBe('Transfer')
  })
})

describe('categoryLabelOf', () => {
  it('spells out the two payroll phases while keeping the Payroll category', () => {
    expect(categoryLabelOf(entry('UC-CASH-02'))).toBe('Payroll: Claim')
    expect(categoryLabelOf(entry('UC-CASH-03'))).toBe('Payroll: Withdraw')
    // Both still fall under the single "Payroll" filter category.
    expect(categoryOf(entry('UC-CASH-02'))).toBe('Payroll')
    expect(categoryOf(entry('UC-CASH-03'))).toBe('Payroll')
  })

  it('leaves non-payroll entries on their plain category name', () => {
    expect(categoryLabelOf(entry('UC-CREDIT-01'))).toBe('Credit')
    expect(categoryLabelOf(entry('UC-EXP-01'))).toBe('Expense')
  })
})

describe('badgeClassOf', () => {
  it('gives the loan taken, the repayment and the refund three distinct colours', () => {
    const lent = badgeClassOf(entry('UC-CREDIT-01'))
    const repaid = badgeClassOf(
      entry('UC-CREDIT-03', { debit: 'Loan Payable', credit: 'Cash — Bank' })
    )
    const refunded = badgeClassOf(entry('UC-CREDIT-04', { debit: 'Loan Payable' }))

    expect(new Set([lent, repaid, refunded]).size).toBe(3)
    // Money borrowed in keeps the category's teal; the two outflows move away from it.
    expect(lent).toContain('accent')
    expect(repaid).toContain('violet')
    expect(refunded).toContain('slate')
  })

  it('colours both legs of a repayment installment the same', () => {
    const principal = badgeClassOf(entry('UC-CREDIT-03', { debit: 'Loan Payable' }))
    const interest = badgeClassOf(entry('UC-CREDIT-03', { debit: 'Interest Expense' }))
    expect(interest).toBe(principal)
  })

  it('leaves the other categories on their category colour', () => {
    expect(badgeClassOf(entry('UC-CREDIT-02'))).toContain('neutral')
    expect(badgeClassOf(entry('UC-EXP-01'))).toContain('error')
    expect(badgeClassOf(entry('UC-CASH-02'))).toContain('warning')
    // A settled wage stays split from an accrued one (pre-existing behaviour).
    expect(badgeClassOf(entry('UC-CASH-03'))).not.toContain('warning')
  })
})

describe('ledger rows', () => {
  it('carries the phase colour onto the posting lead row', () => {
    const [lentRow] = ledgerRows([entry('UC-CREDIT-01')])
    const [repaidRow] = ledgerRows([
      entry('UC-CREDIT-03', { debit: 'Loan Payable', credit: 'Cash — Bank' })
    ])
    expect(lentRow.category).toBe('Credit')
    expect(repaidRow.category).toBe('Credit')
    expect(lentRow.categoryClass).not.toBe(repaidRow.categoryClass)
  })
})
