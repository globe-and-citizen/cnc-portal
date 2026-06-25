import { describe, it, expect } from 'vitest'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { catalogueLedger } from './catalogueLedger'

describe('buildGeneralLedger — catalogue worked example', () => {
  const gl = buildGeneralLedger(catalogueLedger)
  const balanceOf = (account: AccountName): number =>
    gl.trialBalance.find((r) => r.account === account)?.balance ?? 0

  it('is balanced gross (Σ debit lines = Σ credit lines = journal total)', () => {
    expect(gl.totalDebit).toBeCloseTo(678.1, 2)
    expect(gl.totalCredit).toBeCloseTo(678.1, 2)
  })

  it('is balanced net (Σ debit balances = Σ credit balances = trial balance)', () => {
    expect(gl.debitBalanceTotal).toBeCloseTo(253, 2)
    expect(gl.creditBalanceTotal).toBeCloseTo(253, 2)
    expect(gl.balanced).toBe(true)
  })

  it('produces the catalogue §6.3 / §6.4 per-account balances', () => {
    expect(balanceOf('Cash — Safe')).toBeCloseTo(101.25, 2)
    expect(balanceOf('Cash — Bank')).toBeCloseTo(0, 2)
    expect(balanceOf('Cash — Payroll')).toBeCloseTo(10.92, 2)
    expect(balanceOf('Cash — FeeCollector')).toBeCloseTo(0.23, 2)
    expect(balanceOf('Cash — Expense')).toBeCloseTo(29.8, 2)
    expect(balanceOf('Trading account')).toBeCloseTo(0, 2)
    expect(balanceOf('Investor Equity')).toBeCloseTo(138, 2)
    expect(balanceOf('Payroll Expense')).toBeCloseTo(50.8, 2)
    expect(balanceOf('Wage Payable')).toBeCloseTo(0, 2)
  })

  it('emits two journal lines per posting and none for memo-only entries', () => {
    const memo = gl.entries.find((e) => e.useCase === 'DEFAULT-D')
    expect(memo?.lines).toHaveLength(0)
    const dividend = gl.entries.find((e) => e.useCase === 'UC-INV-01')
    expect(dividend?.lines).toHaveLength(2)
  })

  it('drops accounts with no activity (e.g. Owner Capital this period)', () => {
    expect(gl.trialBalance.some((r) => r.account === 'Owner Capital')).toBe(false)
  })

  it('flags an unbalanced book when a posting is missing a leg', () => {
    const halfPosting: LedgerEntry = {
      id: 'broken',
      timestamp: 1,
      useCase: 'CASH-IN',
      debit: 'Cash — Bank',
      credit: null, // mapper bug: a debit with no matching credit
      amountUsd: 5,
      token: 'usdc',
      rawAmount: '5000000',
      internal: false,
      memo: 'half posting',
      enrichment: 'not-applicable'
    }
    const broken = buildGeneralLedger([...catalogueLedger, halfPosting])
    expect(broken.balanced).toBe(false)
    expect(broken.totalDebit).not.toBeCloseTo(broken.totalCredit, 2)
  })
})
