import { describe, it, expect } from 'vitest'
import {
  ACCOUNTS,
  ACCOUNT_NAMES,
  CHART_OF_ACCOUNTS,
  classOf,
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
      'Cash — FeeCollector': 'ASSET',
      'Trading account': 'ASSET',
      'Wage Payable': 'LIABILITY',
      'Shares to be issued': 'LIABILITY',
      'Owner Capital': 'EQUITY',
      'Investor Equity': 'EQUITY',
      'Retained Earnings': 'EQUITY',
      'Service Revenue': 'INCOME',
      'Trading Gain': 'INCOME',
      'Payroll Expense': 'EXPENSE',
      'Operating Expense': 'EXPENSE',
      'Dividend Expense': 'EXPENSE',
      'Trading Loss': 'EXPENSE'
    })
  })

  it('models each on-chain cash pocket as its own asset account', () => {
    const cashPockets = ACCOUNT_NAMES.filter((name) => name.startsWith('Cash — '))
    expect(cashPockets).toEqual([
      'Cash — Bank',
      'Cash — Safe',
      'Cash — Payroll',
      'Cash — Expense',
      'Cash — FeeCollector'
    ])
    cashPockets.forEach((pocket) => expect(classOf(pocket)).toBe('ASSET'))
  })

  it('excludes the Phase 2 gap accounts and treats fees as a move, not an account', () => {
    const forbidden = ['Infrastructure Expense', 'Interest Expense', 'Protocol Fee Revenue', 'Fee']
    forbidden.forEach((name) => expect(ACCOUNT_NAMES).not.toContain(name))
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
        ['Service Revenue', false]
      ]
      expectations.forEach(([account, debit]) => {
        expect(isDebitNormal(account)).toBe(debit)
        expect(normalBalance(account)).toBe(debit ? 'debit' : 'credit')
      })
    })

    it('keeps every account internally consistent with its class', () => {
      ACCOUNT_NAMES.forEach((name) => {
        const expectedDebit = classOf(name) === 'ASSET' || classOf(name) === 'EXPENSE'
        expect(isDebitNormal(name)).toBe(expectedDebit)
      })
    })
  })
})
