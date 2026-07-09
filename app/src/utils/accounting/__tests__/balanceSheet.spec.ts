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

  it('grand totals foot to the cent even when per-pocket rounding would drift', () => {
    // Two 0.005 asset pockets sum to a raw 0.01, but each per-pocket balance
    // rounds up to 0.01 (reads 0.02). Summing the *rounded* pockets would inflate
    // Total assets to 0.02 while Liabilities+Equity reads 0.01 — the reported
    // one-cent gap. Summing raw and rounding once keeps both at 0.01.
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
    // The two grand totals are exactly equal, to the cent (the acceptance criterion).
    expect(bs.totalLiabilitiesAndEquity).toBe(bs.totalAssets)
    // And the displayed split still foots: Liabilities + Equity === Total assets.
    expect(round2(bs.totalLiabilities + bs.totalEquity)).toBe(bs.totalAssets)
    expect(bs.totalAssets).toBeCloseTo(0.01, 2)
  })

  it('keeps Total assets === Liabilities + Equity on the catalogue book', () => {
    expect(bs.totalLiabilitiesAndEquity).toBe(bs.totalAssets)
    expect(round2(bs.totalLiabilities + bs.totalEquity)).toBe(bs.totalAssets)
  })
})

describe('buildBalanceSheet — cash breakdown by pocket and currency', () => {
  const cashIn = (
    id: string,
    account: AccountName,
    token: LedgerEntry['token'],
    rawAmount: string,
    amountUsd: number
  ): LedgerEntry => ({
    id,
    timestamp: 1,
    useCase: 'UC-BANK-02',
    debit: account,
    credit: 'Service Revenue',
    amountUsd,
    token,
    rawAmount,
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  })

  it('splits each pocket into its per-currency holdings', () => {
    const bs = buildBalanceSheet([
      cashIn('a', 'Cash — Bank', 'usdc', '100000000', 100), // 100 USDC → $100
      cashIn('b', 'Cash — Bank', 'native', '2000000000000000000', 0), // 2 POL, unpriced
      cashIn('c', 'Cash — Safe', 'usdc', '50000000', 50) // 50 USDC → $50
    ])
    expect(bs.cashByPocketCurrency).toEqual([
      { account: 'Cash — Bank', token: 'native', amountUsd: 0, tokenAmount: 2 },
      { account: 'Cash — Bank', token: 'usdc', amountUsd: 100, tokenAmount: 100 },
      { account: 'Cash — Safe', token: 'usdc', amountUsd: 50, tokenAmount: 50 }
    ])
  })

  it('keeps an unpriced native holding visible via its token quantity', () => {
    const bs = buildBalanceSheet([
      cashIn('a', 'Cash — Payroll', 'native', '3500000000000000000', 0)
    ])
    const pol = bs.cashByPocketCurrency.find((l) => l.token === 'native')
    expect(pol).toMatchObject({ account: 'Cash — Payroll', amountUsd: 0, tokenAmount: 3.5 })
  })

  it('drops a currency once it nets back to zero in the pocket', () => {
    const out = (id: string): LedgerEntry => ({
      ...cashIn(id, 'Cash — Bank', 'usdc', '100000000', 100),
      debit: 'Service Revenue',
      credit: 'Cash — Bank'
    })
    const bs = buildBalanceSheet([
      cashIn('in', 'Cash — Bank', 'usdc', '100000000', 100),
      out('out')
    ])
    expect(bs.cashByPocketCurrency).toHaveLength(0)
  })
})

const round2 = (n: number): number => Math.round(n * 100) / 100
