import { describe, it, expect } from 'vitest'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { catalogueLedger } from './catalogueLedger'

function balanceSheet(entries: readonly LedgerEntry[]) {
  return buildBalanceSheet(buildJournal(entries))
}

describe('buildBalanceSheet — catalogue §6.6', () => {
  const bs = balanceSheet(catalogueLedger)

  it('satisfies Assets = Liabilities + Equity', () => {
    expect(bs.totalAssets).toBeCloseTo(142.2, 2)
    expect(bs.totalLiabilities).toBeCloseTo(0, 2)
    expect(bs.totalEquity).toBeCloseTo(142.2, 2)
    expect(bs.identityGap).toBeCloseTo(0, 2)
    expect(bs.balanced).toBe(true)
  })

  it('rolls the cash pockets into one Cash line and closes net income into equity', () => {
    expect(bs.cash).toBeCloseTo(142.2, 2)
    expect(bs.investorEquity.amount).toBeCloseTo(138, 2)
    expect(bs.ownerCapital.amount).toBeCloseTo(0, 2)
    expect(bs.retainedEarnings).toBeCloseTo(14.2, 2) // was 4.2; SHER is off the IS
  })

  it('shows no open liabilities once Wage Payable settles', () => {
    expect(bs.liabilities).toHaveLength(0)
  })

  it('surfaces Wage Payable as a liability and SHER as contra-equity when accrued without a withdrawal', () => {
    // Only the accrual legs of transaction #9 (claim), no withdrawal #10.
    const claimOnly = catalogueLedger.filter((e) => e.useCase === 'UC-CASH-02')
    const bs = balanceSheet(claimOnly)
    const wagePayable =
      bs.liabilities.find((l) => l.account.family.name === 'Wage Payable')?.amount ?? 0
    expect(wagePayable).toBeCloseTo(40.8, 2)
    // SHER is now in contra-equity, not liabilities.
    const deferredSher =
      bs.contraEquity.find((l) => l.account.family.name === 'Deferred SHER Compensation')?.amount ??
      0
    expect(deferredSher).toBeCloseTo(10, 2)
    // Only cash wage is a liability now.
    expect(bs.totalLiabilities).toBeCloseTo(40.8, 2)
    // The accrual books Payroll Expense (cash) — the SHER leg is contra-equity.
    expect(bs.retainedEarnings).toBeCloseTo(-40.8, 2)
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
    const bs = balanceSheet([invest('a', 'Cash — Bank'), invest('b', 'Cash — Safe')])
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
    const bs = balanceSheet([invest('a', 'Cash — Bank'), invest('b', 'Cash — Safe')])
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
    const bs = balanceSheet([
      cashIn('a', 'Cash — Bank', 'usdc', '100000000', 100), // 100 USDC → $100
      cashIn('b', 'Cash — Bank', 'native', '2000000000000000000', 0.16), // 2 POL → $0.16
      cashIn('c', 'Cash — Safe', 'usdc', '50000000', 50) // 50 USDC → $50
    ])
    expect(bs.cashByPocketCurrency).toMatchObject([
      {
        account: { family: { name: 'Cash — Bank' } },
        token: 'native',
        amountUsd: 0.16,
        tokenAmount: 2
      },
      {
        account: { family: { name: 'Cash — Bank' } },
        token: 'usdc',
        amountUsd: 100,
        tokenAmount: 100
      },
      {
        account: { family: { name: 'Cash — Safe' } },
        token: 'usdc',
        amountUsd: 50,
        tokenAmount: 50
      }
    ])
  })

  it('reports a native holding in POL as well as USD', () => {
    const bs = balanceSheet([cashIn('a', 'Cash — Payroll', 'native', '3500000000000000000', 0.28)])
    expect(bs.cashByPocketCurrency.find((l) => l.token === 'native')).toMatchObject({
      account: { family: { name: 'Cash — Payroll' } },
      amountUsd: 0.28,
      tokenAmount: 3.5
    })
  })

  it('keeps a native dust holding whose USD value rounds to $0.00', () => {
    // 0.028953 POL at ~$0.08 → ~$0.0023, which rounds to $0.00 — but the POL
    // quantity keeps the holding on the balance sheet instead of vanishing.
    const bs = balanceSheet([cashIn('a', 'Cash — Bank', 'native', '28953000000000000', 0.002328)])
    const pol = bs.cashByPocketCurrency.find((l) => l.token === 'native')
    expect(pol).toMatchObject({ account: { family: { name: 'Cash — Bank' } }, amountUsd: 0 })
    expect(pol?.tokenAmount).toBeCloseTo(0.028953, 6)
  })

  it('drops a currency once it nets back to zero in the pocket', () => {
    const out = (id: string): LedgerEntry => ({
      ...cashIn(id, 'Cash — Bank', 'usdc', '100000000', 100),
      debit: 'Service Revenue',
      credit: 'Cash — Bank'
    })
    const bs = balanceSheet([cashIn('in', 'Cash — Bank', 'usdc', '100000000', 100), out('out')])
    expect(bs.cashByPocketCurrency).toHaveLength(0)
  })

  it('keeps concrete Bank deployments separate for balances, holdings, and drill-down scope', () => {
    const bank1 = '0x1111111111111111111111111111111111111111'
    const bank2 = '0x2222222222222222222222222222222222222222'
    const journal = buildJournal([
      { ...cashIn('bank-1', 'Cash — Bank', 'usdc', '100000000', 100), debitInstance: bank1 },
      {
        ...cashIn('bank-2', 'Cash — Bank', 'usdc', '25000000', 25),
        timestamp: 2,
        debitInstance: bank2
      },
      { ...cashIn('bank-unresolved', 'Cash — Bank', 'usdc', '5000000', 5), timestamp: 3 }
    ])
    const bs = buildBalanceSheet(journal)

    expect(bs.cashByPocket.map((line) => [line.account.id, line.amount])).toEqual([
      ['cash-bank:0x1111111111111111111111111111111111111111', 100],
      ['cash-bank:0x2222222222222222222222222222222222222222', 25],
      ['cash-bank:unresolved', 5]
    ])
    expect(bs.cashByPocketCurrency.map((line) => [line.account.id, line.amountUsd])).toEqual([
      ['cash-bank:0x1111111111111111111111111111111111111111', 100],
      ['cash-bank:0x2222222222222222222222222222222222222222', 25],
      ['cash-bank:unresolved', 5]
    ])
    expect(
      entriesForAccount(journal, bs.cashByPocket[1]!.account).map((entry) => entry.id)
    ).toEqual(['bank-2'])
  })
})

const round2 = (n: number): number => Math.round(n * 100) / 100
