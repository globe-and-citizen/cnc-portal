import { describe, it, expect } from 'vitest'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { catalogueLedger } from './catalogueLedger'

describe('buildBalanceSheet — catalogue §6.6', () => {
  const bs = buildBalanceSheet(catalogueLedger)

  it('satisfies Assets = Liabilities + Equity', () => {
    expect(bs.totalAssets).toBeCloseTo(142.2, 2)
    expect(bs.totalLiabilities).toBeCloseTo(0, 2)
    expect(bs.totalEquity).toBeCloseTo(142.2, 2)
    expect(bs.identityGap).toBeCloseTo(0, 2)
    expect(bs.balanced).toBe(true)
  })

  it('rolls the cash pockets into one Cash line and closes net income into equity', () => {
    expect(bs.cash).toBeCloseTo(142.2, 2)
    expect(bs.investorEquity).toBeCloseTo(138, 2)
    expect(bs.ownerCapital).toBeCloseTo(0, 2)
    expect(bs.retainedEarnings).toBeCloseTo(4.2, 2)
  })

  it('shows no open liabilities once Wage Payable & Shares to be issued settle', () => {
    expect(bs.liabilities).toHaveLength(0)
  })

  it('surfaces open liabilities when a claim is accrued without a withdrawal', () => {
    // Only the accrual legs of transaction #9 (claim), no withdrawal #10.
    const claimOnly = catalogueLedger.filter((e) => e.useCase === 'UC-CASH-02')
    const bs = buildBalanceSheet(claimOnly)
    const wagePayable = bs.liabilities.find((l) => l.account === 'Wage Payable')?.amount ?? 0
    const sharesToIssue =
      bs.liabilities.find((l) => l.account === 'Shares to be issued')?.amount ?? 0
    expect(wagePayable).toBeCloseTo(40.8, 2)
    expect(sharesToIssue).toBeCloseTo(10, 2)
    // The accrual books Payroll Expense against the liabilities — still balances.
    expect(bs.totalLiabilities).toBeCloseTo(50.8, 2)
    expect(bs.retainedEarnings).toBeCloseTo(-50.8, 2)
    expect(bs.balanced).toBe(true)
  })

  it('stays balanced when per-account rounding would drift a cent', () => {
    // Two 0.005 investments land on different cash pockets (each rounds up to
    // 0.01 → assets read 0.02), but the pooled 0.01 Investor Equity rounds to a
    // single 0.01. The raw identity is exactly 0, so the book balances.
    const invest = (id: string, cash: AccountName): LedgerEntry => ({
      id,
      timestamp: 1,
      useCase: 'UC-SDR-01',
      debit: cash,
      credit: 'Investor Equity',
      amountUsd: 0.005,
      token: 'usdc',
      rawAmount: '5000',
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    })
    const bs = buildBalanceSheet([invest('a', 'Cash — Bank'), invest('b', 'Cash — Safe')])
    expect(bs.identityGap).toBeCloseTo(0, 2)
    expect(bs.balanced).toBe(true)
  })
})
