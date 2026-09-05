import { describe, expect, it } from 'vitest'
import { buildBalanceSheet } from '@/utils/accounting/balanceSheet'
import { buildGeneralLedger, buildJournal } from '@/utils/accounting/generalLedger'
import { entriesForAccount } from '@/utils/accounting/accountLedger'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import { catalogueLedger } from './catalogueLedger'

function balanceSheet(entries: readonly LedgerEntry[]) {
  return buildBalanceSheet(buildJournal(entries))
}

function posting(
  id: string,
  debit: AccountName,
  credit: AccountName,
  amountUsd: number
): LedgerEntry {
  return {
    id,
    timestamp: 1,
    useCase: 'CASH-IN',
    debit,
    credit,
    amountUsd,
    token: 'usdc',
    rawAmount: String(Math.round(amountUsd * 1_000_000)),
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  }
}

describe('buildBalanceSheet', () => {
  it('reuses every permanent concrete Trial Balance account row', () => {
    const journal = buildJournal(catalogueLedger)
    const trialRows = buildGeneralLedger(journal).trialBalance.filter((row) =>
      ['ASSET', 'LIABILITY', 'EQUITY', 'CONTRA_EQUITY'].includes(row.account.family.accountClass)
    )
    const balance = buildBalanceSheet(journal)

    expect([...balance.assets, ...balance.liabilities, ...balance.equity]).toEqual(
      trialRows.map((row) =>
        expect.objectContaining({
          account: row.account,
          accountLabel: row.accountLabel,
          balance: row.balance
        })
      )
    )
  })

  it('lists cash accounts directly instead of creating an all-pockets aggregate', () => {
    const balance = balanceSheet([
      posting('bank', 'Cash — Bank', 'Service Revenue', 100),
      posting('payroll', 'Cash — Payroll', 'Owner Capital', 25)
    ])

    expect(balance.assets.map((line) => line.account.family.name)).toEqual([
      'Cash — Bank',
      'Cash — Payroll'
    ])
    expect(balance.assets.map((line) => line.balance)).toEqual([100, 25])
  })

  it('explains earnings to date with its concrete revenue and expense accounts', () => {
    const balance = balanceSheet([
      posting('revenue', 'Cash — Bank', 'Service Revenue', 100),
      posting('expense', 'Operating Expense', 'Cash — Bank', 30)
    ])

    expect(
      balance.earnings.map((line) => [line.account.family.name, line.balance, line.contribution])
    ).toEqual([
      ['Service Revenue', 100, 100],
      ['Operating Expense', 30, -30]
    ])
    expect(balance.earningsToDate).toBe(70)
    expect(balance.totalEquity).toBe(70)
  })

  it('shows SHERS To Be Issued and contra-equity as separate signed contributions', () => {
    const balance = balanceSheet([
      posting('grant', 'Deferred SHER Compensation', 'SHERS To Be Issued', 6)
    ])

    expect(
      balance.equity.map((line) => [line.account.family.name, line.balance, line.contribution])
    ).toEqual([
      ['Deferred SHER Compensation', 6, -6],
      ['SHERS To Be Issued', 6, 6]
    ])
    expect(balance.totalEquity).toBe(0)
    expect(balance.balanced).toBe(true)
  })

  it('keeps later and unresolved Bank accounts separate and drillable', () => {
    const bank1 = '0x1111111111111111111111111111111111111111'
    const bank2 = '0x2222222222222222222222222222222222222222'
    const journal = buildJournal([
      { ...posting('bank-1', 'Cash — Bank', 'Service Revenue', 100), debitInstance: bank1 },
      {
        ...posting('bank-2', 'Cash — Bank', 'Service Revenue', 25),
        timestamp: 2,
        debitInstance: bank2
      },
      { ...posting('bank-unresolved', 'Cash — Bank', 'Service Revenue', 5), timestamp: 3 }
    ])
    const balance = buildBalanceSheet(journal)

    expect(balance.assets.map((line) => [line.account.id, line.accountLabel])).toEqual([
      ['cash-bank:0x1111111111111111111111111111111111111111', 'Cash — Bank'],
      ['cash-bank:0x2222222222222222222222222222222222222222', 'Cash — Bank 2'],
      ['cash-bank:unresolved', 'Cash — Bank (unresolved)']
    ])
    expect(entriesForAccount(journal, balance.assets[1]!.account).map((entry) => entry.id)).toEqual(
      ['bank-2']
    )
  })

  it('rounds section totals once from the unrounded account balances', () => {
    const balance = balanceSheet([
      posting('bank', 'Cash — Bank', 'Investor Equity', 0.005),
      posting('safe', 'Cash — Safe', 'Investor Equity', 0.005)
    ])

    expect(balance.assets.map((line) => line.balance)).toEqual([0.01, 0.01])
    expect(balance.totalAssets).toBe(0.01)
    expect(balance.totalLiabilitiesAndEquity).toBe(0.01)
    expect(balance.identityGap).toBe(0)
    expect(balance.balanced).toBe(true)
  })
})
