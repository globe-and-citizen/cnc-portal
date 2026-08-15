import { describe, it, expect } from 'vitest'
import {
  ACCOUNTS,
  ACCOUNT_NAMES,
  CHART_OF_ACCOUNTS,
  CONTRA_ACCOUNTS,
  classOf,
  isContraAccount,
  isDebitNormal,
  isDebitNormalClass,
  normalBalance,
  type AccountClass,
  type AccountName
} from '../chartOfAccounts'

describe('chart of accounts', () => {
  it('declares every CNC account from the catalogue with its class', () => {
    expect(CHART_OF_ACCOUNTS).toEqual({
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
      'Owner Capital': 'EQUITY',
      'Investor Equity': 'EQUITY',
      'SHERS To Be Issued': 'EQUITY',
      'Deferred SHER Compensation': 'EQUITY',
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

  it('exposes ACCOUNTS as { name, class } records matching the map', () => {
    expect(ACCOUNTS).toHaveLength(ACCOUNT_NAMES.length)
    ACCOUNTS.forEach((account) => {
      expect(account.class).toBe(CHART_OF_ACCOUNTS[account.name])
    })
  })

  describe('normal balance', () => {
    it('puts ASSET and EXPENSE on the debit side', () => {
      const debitClasses: AccountClass[] = ['ASSET', 'EXPENSE']
      debitClasses.forEach((cls) => expect(isDebitNormalClass(cls)).toBe(true))
    })

    it('puts LIABILITY, EQUITY and INCOME on the credit side', () => {
      const creditClasses: AccountClass[] = ['LIABILITY', 'EQUITY', 'INCOME']
      creditClasses.forEach((cls) => expect(isDebitNormalClass(cls)).toBe(false))
    })

    it('derives isDebitNormal / normalBalance per account', () => {
      const expectations: Array<[AccountName, boolean]> = [
        ['Cash — Bank', true],
        ['Trading account', true],
        ['Payroll Expense', true],
        ['Wage Payable', false],
        ['Investor Equity', false],
        ['Service Revenue', false],
        // Contra-equity: sits in EQUITY but carries a debit balance.
        ['Deferred SHER Compensation', true]
      ]
      expectations.forEach(([account, debit]) => {
        expect(isDebitNormal(account)).toBe(debit)
        expect(normalBalance(account)).toBe(debit ? 'debit' : 'credit')
      })
    })

    it('keeps every account consistent with its class, contra accounts flipped', () => {
      ACCOUNT_NAMES.forEach((name) => {
        const byClass = classOf(name) === 'ASSET' || classOf(name) === 'EXPENSE'
        const expectedDebit = isContraAccount(name) ? !byClass : byClass
        expect(isDebitNormal(name)).toBe(expectedDebit)
      })
    })
  })

  describe('contra accounts', () => {
    it('declares Deferred SHER Compensation as the only contra account', () => {
      expect([...CONTRA_ACCOUNTS]).toEqual(['Deferred SHER Compensation'])
    })

    it('keeps the SHER pair inside equity so it never reaches the income statement', () => {
      // Both legs of a SHER wage accrual are equity: the debit is contra, the
      // credit is a normal equity claim, so the pair nets to zero (issue #2458).
      expect(classOf('Deferred SHER Compensation')).toBe('EQUITY')
      expect(classOf('SHERS To Be Issued')).toBe('EQUITY')
      expect(isContraAccount('Deferred SHER Compensation')).toBe(true)
      expect(isContraAccount('SHERS To Be Issued')).toBe(false)
    })
  })
})
