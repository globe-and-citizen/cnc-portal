import { describe, expect, it } from 'vitest'
import {
  accountLedgerTitle,
  accountNet,
  accountOpening,
  entriesForAccount,
  NO_OPENING,
  openingRow,
  withRunningBalance
} from '@/utils/accounting/accountLedger'
import { buildGeneralLedger, buildJournal } from '@/utils/accounting/generalLedger'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'
import { money } from '@/utils/accounting/presenter'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { catalogueLedger } from './catalogueLedger'

const journal = buildJournal(catalogueLedger)
const generalLedger = buildGeneralLedger(journal)

function trialBalanceOf(account: AccountName): number {
  return generalLedger.trialBalance.find((row) => row.account.family.name === account)?.balance ?? 0
}

describe('accountLedger — JournalEntry drill-downs', () => {
  it('selects complete JournalEntry records by account family, oldest first', () => {
    const entries = entriesForAccount(journal, 'Investor Equity')

    expect(entries.length).toBeGreaterThan(0)
    expect(
      entries.every((entry) =>
        entry.lines.some((line) => line.account.family.name === 'Investor Equity')
      )
    ).toBe(true)
    expect(entries.map((entry) => entry.timestamp)).toEqual(
      [...entries.map((entry) => entry.timestamp)].sort((a, b) => a - b)
    )
  })

  it('selects a Trial Balance concrete Account without inferring a deployment', () => {
    const account = generalLedger.trialBalance.find(
      (row) => row.account.family.name === 'Cash — Safe'
    )!.account
    const entries = entriesForAccount(journal, account)

    expect(entries.length).toBeGreaterThan(0)
    expect(
      entries.every((entry) => entry.lines.some((line) => line.account.id === account.id))
    ).toBe(true)
  })

  it.each([
    'Cash — Safe',
    'Cash — Payroll',
    'Cash — Expense',
    'Investor Equity',
    'Payroll Expense',
    'Deferred SHER Compensation'
  ] as AccountName[])('%s reconciles to its Trial Balance row', (account) => {
    const entries = entriesForAccount(journal, account)
    expect(money(accountNet(entries, account))).toBe(money(trialBalanceOf(account)))
  })

  it('runs the balance only on rows posted to the selected account', () => {
    const account: AccountName = 'Cash — Safe'
    const entries = entriesForAccount(journal, account)
    const rows = withRunningBalance(journalLedgerRows(entries, journal), account, 0)
    const balances = rows.filter((row) => row.balance)

    expect(balances.length).toBeGreaterThan(1)
    expect(balances.at(-1)?.balance).toBe(money(accountNet(entries, account)))
    expect(rows.filter((row) => row.account !== account).every((row) => !row.balance)).toBe(true)
  })

  it('carries prior journal lines into a dated window', () => {
    const account: AccountName = 'Cash — Safe'
    const all = entriesForAccount(journal, account)
    const from = new Date((all[1]!.timestamp + 1) * 1000)
    const opening = accountOpening(journal, account, from)
    const prior = entriesForAccount(journal, account, null, new Date(from.getTime() - 1000))
    const current = entriesForAccount(journal, account, from)

    expect(opening).not.toEqual(NO_OPENING)
    expect(opening.balance).toBe(accountNet(prior, account))
    expect(money(opening.balance + accountNet(current, account))).toBe(
      money(trialBalanceOf(account))
    )
  })

  it('renders an opening balance as a non-posting row', () => {
    const row = openingRow({ debits: 12, credits: 4, balance: 8 })
    expect(row).toMatchObject({
      label: 'Opening balance',
      date: '',
      category: '',
      balance: '$8.00'
    })
  })

  it('keeps a transfer fee as an ordinary line of its one JournalEntry', () => {
    const txHash = `0x${'a'.repeat(64)}`
    const transfer: LedgerEntry = {
      id: `${txHash}-5`,
      timestamp: 100,
      useCase: 'UC-BANK-03',
      debit: 'Cash — Payroll',
      credit: 'Cash — Bank',
      amountUsd: 2,
      token: 'usdc',
      rawAmount: '2000000',
      rate: 1,
      internal: true,
      memo: 'Fund Cash — Payroll from Bank',
      enrichment: 'not-applicable'
    }
    const fee: LedgerEntry = {
      id: `${txHash}-3`,
      timestamp: 100,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      amountUsd: 0.5,
      token: 'usdc',
      rawAmount: '500000',
      rate: 1,
      internal: false,
      memo: 'Transaction fee skimmed from Bank',
      enrichment: 'not-applicable'
    }

    const feeJournal = buildJournal([transfer, fee])
    const entries = entriesForAccount(feeJournal, 'Cash — Bank')
    const rows = journalLedgerRows(entries, feeJournal)
    expect(entries).toHaveLength(1)
    expect(rows.map((row) => row.account)).toEqual([
      'Cash — Payroll',
      'Transaction Fee Expense',
      'Cash — Bank'
    ])
    expect(money(accountNet(entries, 'Cash — Bank'))).toBe('-$2.50')
  })

  it('labels scoped ledgers consistently', () => {
    expect(accountLedgerTitle('Cash — Safe')).toBe('General Ledger — Cash — Safe')
    expect(accountLedgerTitle('Cash — Safe', null, new Date('2026-03-31T00:00:00Z'))).toMatch(
      /^General Ledger — Cash — Safe — As of /
    )
  })
})
