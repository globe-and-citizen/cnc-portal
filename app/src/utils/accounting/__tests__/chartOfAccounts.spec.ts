import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_FAMILIES,
  ACCOUNT_NAMES,
  accountFamilyOf,
  classOf,
  type AccountName
} from '../chartOfAccounts'

describe('chart of accounts', () => {
  it('declares every CNC account from the catalogue with its class', () => {
    expect(
      Object.fromEntries(ACCOUNT_FAMILIES.map((family) => [family.name, family.accountClass]))
    ).toEqual({
      'Cash — Bank': 'ASSET',
      'Cash — Safe': 'ASSET',
      'Cash — Payroll': 'ASSET',
      'Cash — Expense': 'ASSET',
      'Cash — Credit': 'ASSET',
      'Cash — FeeCollector': 'ASSET',
      'Trading account': 'ASSET',
      'Wage Payable': 'LIABILITY',
      'Loan Payable': 'LIABILITY',
      'Interest Payable': 'LIABILITY',
      'Deferred SHER Compensation': 'CONTRA_EQUITY',
      'SHERS To Be Issued': 'EQUITY',
      'Owner Capital': 'EQUITY',
      'Investor Equity': 'EQUITY',
      'Retained Earnings': 'EQUITY',
      'Service Revenue': 'INCOME',
      'Trading Gain': 'INCOME',
      'Payroll Expense': 'EXPENSE',
      'Operating Expense': 'EXPENSE',
      'Interest Expense': 'EXPENSE',
      'Dividend Expense': 'EXPENSE',
      'Trading Loss': 'EXPENSE',
      'Transaction Fee Expense': 'EXPENSE'
    })
  })

  it('models each on-chain cash pocket as its own asset account', () => {
    const cashPockets = ACCOUNT_NAMES.filter((name) => name.startsWith('Cash — '))
    expect(cashPockets).toEqual([
      'Cash — Bank',
      'Cash — Safe',
      'Cash — Payroll',
      'Cash — Expense',
      'Cash — Credit',
      'Cash — FeeCollector'
    ])
    cashPockets.forEach((pocket) => expect(classOf(pocket)).toBe('ASSET'))
  })

  it('excludes the Phase 2 gap accounts and treats fees as a move, not an account', () => {
    const forbidden = ['Infrastructure Expense', 'Protocol Fee Revenue', 'Fee']
    forbidden.forEach((name) => expect(ACCOUNT_NAMES).not.toContain(name))
  })

  it('books the Community Credit accounts (FixedReturn feed)', () => {
    expect(classOf('Cash — Credit')).toBe('ASSET')
    expect(classOf('Loan Payable')).toBe('LIABILITY')
    expect(classOf('Interest Payable')).toBe('LIABILITY')
    expect(classOf('Interest Expense')).toBe('EXPENSE')
  })

  it('books SHER compensation as contra-equity, not as an expense', () => {
    expect(classOf('Deferred SHER Compensation')).toBe('CONTRA_EQUITY')
    expect(classOf('SHERS To Be Issued')).toBe('EQUITY')
    expect(accountFamilyOf('Deferred SHER Compensation').normalBalance).toBe('debit')
    expect(accountFamilyOf('SHERS To Be Issued').normalBalance).toBe('credit')
  })

  it('keeps every shared account attribute in one canonical family object', () => {
    const bank = accountFamilyOf('Cash — Bank')

    expect(bank).toEqual({
      id: 'cash-bank',
      name: 'Cash — Bank',
      accountClass: 'ASSET',
      normalBalance: 'debit',
      deploymentScoped: true
    })
    expect(ACCOUNT_FAMILIES.map((family) => family.name)).toEqual(ACCOUNT_NAMES)
  })

  describe('normal balance', () => {
    it('derives the normal side per account from its canonical family', () => {
      const expectations: Array<[AccountName, boolean]> = [
        ['Cash — Bank', true],
        ['Trading account', true],
        ['Payroll Expense', true],
        ['Deferred SHER Compensation', true],
        ['Wage Payable', false],
        ['Investor Equity', false],
        ['SHERS To Be Issued', false],
        ['Service Revenue', false]
      ]
      expectations.forEach(([account, debit]) => {
        expect(accountFamilyOf(account).normalBalance).toBe(debit ? 'debit' : 'credit')
      })
    })

    it('keeps every account internally consistent with its class', () => {
      ACCOUNT_NAMES.forEach((name) => {
        const cls = classOf(name)
        const expectedDebit = cls === 'ASSET' || cls === 'EXPENSE' || cls === 'CONTRA_EQUITY'
        expect(accountFamilyOf(name).normalBalance).toBe(expectedDebit ? 'debit' : 'credit')
      })
    })
  })
})
