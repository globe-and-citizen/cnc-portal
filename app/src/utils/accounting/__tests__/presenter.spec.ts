import { describe, it, expect } from 'vitest'
import {
  money,
  formatUnixDate,
  formatUnixDateTime,
  presentIncome,
  presentBalance,
  presentTrial,
  filterByPeriod,
  incomeExportTitle,
  balanceExportTitle,
  trialExportTitle,
  currencySymbol
} from '@/utils/accounting/presenter'
import { presentJournalLedger } from '@/utils/accounting/journalLedgerPresenter'
import { accountFor } from '@/utils/accounting/accountRegistry'
import { buildJournal } from '@/utils/accounting/generalLedger'
import { categoryOf } from '@/utils/accounting/ledgerCategory'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { sampleBooks } from './fixtures'

/** The shared live book: a $100 client deposit and a $30 expense payout. */
const books = sampleBooks

describe('formatters', () => {
  it('money formats USD with two decimals', () => {
    expect(money(142.2)).toBe('$142.20')
    expect(money(0)).toBe('$0.00')
  })

  it('money collapses a negative-zero / sub-cent residue to a clean $0.00', () => {
    expect(money(-0)).toBe('$0.00') // never "$-0.00"
    expect(money(-0.004)).toBe('$0.00') // rounds to zero, no stray minus sign
    expect(money(-0.002 + -0.002)).toBe('$0.00') // sub-cent residue stays clean
    expect(money(-0.01)).toBe('-$0.01') // a real cent still reads negative
  })

  it('formatUnixDate renders a unix-seconds timestamp', () => {
    expect(formatUnixDate(Math.floor(Date.parse('2026-03-01T00:00:00Z') / 1000))).toContain('2026')
  })

  it('formatUnixDateTime keeps the time of day (per-second precision)', () => {
    const out = formatUnixDateTime(Math.floor(Date.parse('2026-03-01T14:05:32Z') / 1000))
    expect(out).toContain('2026')
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/) // HH:mm:ss present
  })
})

describe('presentIncome', () => {
  it('lists revenue and expense lines for the full period', () => {
    const income = presentIncome(books().journal)
    expect(income.revenueLines).toContainEqual({
      label: 'Service Revenue',
      value: '$100.00',
      account: 'Service Revenue'
    })
    expect(income.expenseLines).toContainEqual({
      label: 'Operating Expense',
      value: '$30.00',
      account: 'Operating Expense'
    })
    expect(income.netIncome).toBe('$70.00')
  })

  it('narrows to a reporting period', () => {
    // Window that excludes the ts=200 expense, keeping only the ts=100 revenue.
    const income = presentIncome(books().journal, new Date(50_000), new Date(150_000))
    expect(income.totalRevenue).toBe('$100.00')
    expect(income.totalExpenses).toBe('$0.00')
  })
})

describe('presentBalance', () => {
  it('rolls cash into a single line plus equity breakdown', () => {
    const balance = presentBalance(books().journal)
    expect(balance.assetLines[0].label).toBe('Cash (all pockets)')
    expect(balance.equityLines.map((l) => l.label)).toEqual([
      'Owner capital',
      'Investor equity (SHER)',
      'Retained earnings (net profit)'
    ])
    expect(balance.liabilityLines).toContainEqual({ label: 'None (no debt)', value: '$0.00' })
  })

  it('breaks cash down by pocket and currency under the total', () => {
    const balance = presentBalance(books().journal)
    // The USDC deposit lands in the Bank pocket → a "• Bank · USDC" drill-down
    // line that opens the Cash — Bank account.
    expect(balance.assetLines.find((line) => line.label === '• Bank · USDC')).toMatchObject({
      value: '$100.00',
      account: { family: { name: 'Cash — Bank' } }
    })
  })

  const nativeLabel = `• Bank · ${currencySymbol('native')}`
  const nativeEntry = (amountUsd: number): LedgerEntry => ({
    id: 'pol',
    timestamp: 1,
    useCase: 'UC-BANK-02',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd,
    token: 'native',
    rawAmount: '28953000000000000', // 0.028953 POL
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  })

  it('shows a native holding as its quantity and its USD equivalent', () => {
    // 0.028953 POL at ~$0.08 → ~$0.0023, which rounds to $0.00 — the quantity is
    // what keeps the holding legible, but the $ equivalence is still printed.
    const line = presentBalance(buildJournal([nativeEntry(0.002328)])).assetLines.find(
      (l) => l.label === nativeLabel
    )
    expect(line?.value).toBe(`0.028953 ${currencySymbol('native')} ≈ $0.00`)
  })

  it('lists a non-cash asset (Trading account) as its own drillable asset line', () => {
    const tradingEntry: LedgerEntry = {
      id: 'trd',
      timestamp: 1,
      useCase: 'CASH-OUT',
      debit: 'Trading account',
      credit: 'Cash — Bank',
      amountUsd: 30,
      token: 'usdc',
      rawAmount: '30000000',
      internal: false,
      memo: '',
      enrichment: 'not-applicable'
    }
    const balance = presentBalance(buildJournal([tradingEntry]))
    expect(balance.assetLines.find((line) => line.label === 'Trading account')).toMatchObject({
      value: '$30.00',
      account: { family: { name: 'Trading account' } }
    })
  })

  it('labels later Bank deployments separately while retaining their concrete account selections', () => {
    const journal = buildJournal([
      {
        ...nativeEntry(100),
        id: 'bank-1',
        token: 'usdc',
        rawAmount: '100000000',
        debitInstance: '0x1111111111111111111111111111111111111111'
      },
      {
        ...nativeEntry(25),
        id: 'bank-2',
        timestamp: 2,
        token: 'usdc',
        rawAmount: '25000000',
        debitInstance: '0x2222222222222222222222222222222222222222'
      }
    ])
    const bankLines = presentBalance(journal).assetLines.filter((line) =>
      line.label.startsWith('• Bank')
    )

    expect(bankLines.map((line) => line.label)).toEqual(['• Bank · USDC', '• Bank 2 · USDC'])
    expect(
      bankLines.map((line) => (typeof line.account === 'string' ? line.account : line.account?.id))
    ).toEqual([
      'cash-bank:0x1111111111111111111111111111111111111111',
      'cash-bank:0x2222222222222222222222222222222222222222'
    ])
  })
})

describe('presentTrial', () => {
  it('puts each account balance on its normal side and stays balanced', () => {
    const trial = presentTrial(books().generalLedger)
    expect(trial.balanced).toBe(true)
    const revenue = trial.rows.find((r) => r.account.family.name === 'Service Revenue')
    expect(revenue?.nature).toBe('Income')
    expect(revenue?.cr).toBe('$100.00') // income is credit-normal
    expect(revenue?.dr).toBe('—')
  })
})

describe('presentJournalLedger', () => {
  it('emits two rows per posting and counts entries (not rows)', () => {
    const ledger = presentJournalLedger(books().journal)
    expect(ledger.entryCount).toBe(2)
    expect(ledger.rows).toHaveLength(4)
    // First leg carries the date + label; the credit leg is blanked.
    expect(ledger.rows[0].isFirst).toBe(true)
    expect(ledger.rows[1].isFirst).toBe(false)
  })

  it('filters by account', () => {
    const ledger = presentJournalLedger(books().journal, null, null, null, [
      accountFor('Service Revenue').id
    ])
    expect(ledger.entryCount).toBe(1)
    expect(ledger.rows[0].category).toBe('Revenue')
  })

  it('categorizes the Bank protocol fee as an Expense (not a neutral Transfer)', () => {
    const fee: LedgerEntry = {
      id: 'fee-1',
      timestamp: 100,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      amountUsd: 0.5,
      token: 'usdc',
      rawAmount: '500000',
      memo: 'Transaction fee skimmed from Bank',
      enrichment: 'not-applicable'
    }
    expect(categoryOf(fee)).toBe('Expense')
    const ledger = presentJournalLedger(buildJournal([fee]))
    expect(ledger.entryCount).toBe(0)
    expect(ledger.rows).toEqual([])
  })

  it('labels the transaction by its accounting entry, not the raw memo', () => {
    const ledger = presentJournalLedger(books().journal, null, null, null, [
      accountFor('Service Revenue').id
    ])
    expect(ledger.rows[0].label).toBe('Service revenue') // normalized UC-BANK-02 label
  })

  it('attaches a structured activity (actor + predicate) without touching the accounting label', () => {
    const ledger = presentJournalLedger(books().journal, null, null, null, [
      accountFor('Service Revenue').id
    ])
    expect(ledger.rows[0].label).toBe('Service revenue') // accounting label unchanged
    expect(ledger.rows[0].activity).toMatchObject({
      kind: 'actor',
      text: 'paid $100.00 for services'
    })
    expect(ledger.rows[1].activity).toEqual({ kind: 'plain', text: '' }) // credit leg stays blank
  })
})

describe('filterByPeriod', () => {
  const entries = books().entries
  it('keeps entries inside an inclusive window', () => {
    expect(filterByPeriod(entries, new Date(150_000), null)).toHaveLength(1) // only ts=200
    expect(filterByPeriod(entries, null, new Date(150_000))).toHaveLength(1) // only ts=100
    expect(filterByPeriod(entries)).toHaveLength(2) // open both ends
  })
})

describe('statement export titles', () => {
  it('names the reporting period on the income statement only when one is set', () => {
    expect(incomeExportTitle()).toBe('Income Statement')
    expect(incomeExportTitle(null, null)).toBe('Income Statement')
    const ranged = incomeExportTitle(new Date('2026-01-01'), new Date('2026-02-01'))
    expect(ranged).toContain('Income Statement')
    expect(ranged).toContain('Jan 1, 2026')
    expect(ranged).toContain('Feb 1, 2026')
  })

  it('stamps the "as of" date on the balance sheet / trial balance when set', () => {
    expect(balanceExportTitle()).toBe('Balance Sheet')
    expect(balanceExportTitle(new Date('2026-07-08'))).toBe('Balance Sheet — As of Jul 8, 2026')
    expect(trialExportTitle()).toBe('Trial Balance')
    expect(trialExportTitle(new Date('2026-07-08'))).toBe('Trial Balance — As of Jul 8, 2026')
  })
})
