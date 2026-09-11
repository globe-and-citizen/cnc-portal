import { describe, expect, it } from 'vitest'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { badgeClassOf, categoryLabelOf, categoryOf } from '@/utils/accounting/ledgerCategory'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'
import type { JournalEntryDraft, UseCase } from '@/utils/accounting/journalEntryDraft'

const base = {
  id: 'e1',
  timestamp: 1_700_000_000,
  debit: 'Cash — Credit' as const,
  credit: 'Loan Payable' as const,
  token: 'usdc' as const,
  rawAmount: '100000000',
  rate: 1,
  memo: '',
  internal: false,
  enrichment: 'not-applicable' as const
}

const source = (useCase: UseCase, over: Partial<JournalEntryDraft> = {}): JournalEntryDraft => ({
  ...base,
  useCase,
  ...over
})
const entry = (useCase: UseCase, over: Partial<JournalEntryDraft> = {}) =>
  finalizeJournal([source(useCase, over)])[0]!

describe('categoryOf', () => {
  it('gathers the borrowing lifecycle from its liability and interest accounts', () => {
    expect(categoryOf(entry('UC-CREDIT-01'))).toBe('Credit')
    expect(
      categoryOf(entry('UC-CREDIT-03', { debit: 'Loan Payable', credit: 'Cash — Bank' }))
    ).toBe('Credit')
    expect(
      categoryOf(entry('UC-CREDIT-04', { debit: 'Loan Payable', credit: 'Cash — Credit' }))
    ).toBe('Credit')
  })

  it('derives revenue and every assignable nature from concrete line accounts', () => {
    expect(
      categoryOf(entry('UC-BANK-02', { debit: 'Cash — Bank', credit: 'Service Revenue' }))
    ).toBe('Revenue')
    expect(categoryOf(entry('CASH-OUT', { debit: 'Owner Capital', credit: 'Cash — Bank' }))).toBe(
      'Investment'
    )
    expect(categoryOf(entry('CASH-OUT', { debit: 'Payroll Expense', credit: 'Cash — Bank' }))).toBe(
      'Payroll'
    )
    expect(
      categoryOf(entry('CASH-OUT', { debit: 'Interest Expense', credit: 'Cash — Bank' }))
    ).toBe('Credit')
    expect(
      categoryOf(entry('CASH-OUT', { debit: 'Dividend Expense', credit: 'Cash — Bank' }))
    ).toBe('Dividend')
    expect(
      categoryOf(entry('CASH-OUT', { debit: 'Operating Expense', credit: 'Cash — Bank' }))
    ).toBe('Expense')
  })

  it('keeps a company-pocket movement under Transfer even when it carries a fee line', () => {
    const tx = `0x${'c'.repeat(64)}`
    const journal = finalizeJournal([
      source('UC-BANK-03', {
        id: `${tx}-1`,
        debit: 'Cash — Payroll',
        credit: 'Cash — Bank',
        internal: true
      }),
      source('FEE', {
        id: `${tx}-2`,
        debit: 'Transaction Fee Expense',
        credit: 'Cash — Bank',
        rawAmount: '1000000'
      })
    ])[0]!
    expect(journal.internal).toBe(true)
    expect(categoryOf(journal)).toBe('Transfer')
  })
})

describe('categoryLabelOf', () => {
  it('spells out the two payroll phases while retaining the account-derived family', () => {
    const accrual = entry('UC-CASH-02', { debit: 'Payroll Expense', credit: 'Wage Payable' })
    const settlement = entry('UC-CASH-03', { debit: 'Wage Payable', credit: 'Cash — Payroll' })
    expect(categoryLabelOf(accrual)).toBe('Payroll: Claim')
    expect(categoryLabelOf(settlement)).toBe('Payroll: Withdraw')
    expect(categoryOf(accrual)).toBe('Payroll')
    expect(categoryOf(settlement)).toBe('Payroll')
  })
})

describe('badgeClassOf', () => {
  it('gives the loan taken, repayment and refund distinct lifecycle colours', () => {
    const lent = badgeClassOf(entry('UC-CREDIT-01'))
    const repaid = badgeClassOf(
      entry('UC-CREDIT-03', { debit: 'Loan Payable', credit: 'Cash — Bank' })
    )
    const refunded = badgeClassOf(
      entry('UC-CREDIT-04', { debit: 'Loan Payable', credit: 'Cash — Credit' })
    )
    expect(new Set([lent, repaid, refunded]).size).toBe(3)
    expect(lent).toContain('accent')
    expect(repaid).toContain('violet')
    expect(refunded).toContain('slate')
  })

  it('carries the phase colour onto the JournalEntry lead row', () => {
    const [lentRow] = journalLedgerRows(finalizeJournal([source('UC-CREDIT-01')]))
    const [repaidRow] = journalLedgerRows(
      finalizeJournal([source('UC-CREDIT-03', { debit: 'Loan Payable', credit: 'Cash — Bank' })])
    )
    expect(lentRow.category).toBe('Credit')
    expect(repaidRow.category).toBe('Credit')
    expect(lentRow.categoryClass).not.toBe(repaidRow.categoryClass)
  })
})
