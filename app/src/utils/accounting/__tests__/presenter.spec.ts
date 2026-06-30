import { describe, it, expect } from 'vitest'
import type { Address } from 'viem'
import { assembleCncAccounting, type CncAccounting } from '@/utils/accounting/assemble'
import {
  money,
  fmtDate,
  fmtDateTime,
  presentSummaryCards,
  presentBanner,
  presentIncome,
  presentBalance,
  presentTrial,
  filterByPeriod
} from '@/utils/accounting/presenter'
import { presentLedger } from '@/utils/accounting/ledgerPresenter'
import { makeNameResolver } from '@/utils/accounting/describeEntry'
import { USDC_ADDRESS } from '@/constant'
import { ADDR } from './fixtures'

/** A small live book: a $100 client deposit and a $30 expense payout. */
function books(): CncAccounting {
  return assembleCncAccounting({
    contracts: [
      { type: 'Bank', address: ADDR.bank as Address, deployer: ADDR.bank as Address, admins: [] },
      {
        type: 'ExpenseAccountEIP712',
        address: ADDR.expense as Address,
        deployer: ADDR.bank as Address,
        admins: []
      }
    ],
    bankEvents: {
      bankDeposits: { items: [] },
      bankTokenDeposits: {
        items: [
          {
            id: 'bd1',
            contractAddress: ADDR.bank,
            depositor: ADDR.client,
            token: USDC_ADDRESS,
            amount: '100000000', // 100 USDC, ts 100
            timestamp: 100
          }
        ]
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: { items: [] },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    },
    expenseEvents: {
      expenseDeposits: { items: [] },
      expenseTokenDeposits: { items: [] },
      expenseTransfers: { items: [] },
      expenseTokenTransfers: {
        items: [
          {
            id: 'et1',
            contractAddress: ADDR.expense,
            withdrawer: ADDR.expense,
            to: ADDR.member,
            token: USDC_ADDRESS,
            amount: '30000000', // 30 USDC, ts 200
            timestamp: 200
          }
        ]
      },
      expenseApprovals: { items: [] },
      expenseOwnerTreasuryWithdrawNatives: { items: [] },
      expenseOwnerTreasuryWithdrawTokens: { items: [] },
      expenseTokenSupportAddeds: { items: [] },
      expenseTokenSupportRemoveds: { items: [] },
      expenseTokenAddressChangeds: { items: [] }
    }
  })
}

describe('formatters', () => {
  it('money formats USD with two decimals', () => {
    expect(money(142.2)).toBe('$142.20')
    expect(money(0)).toBe('$0.00')
  })

  it('fmtDate renders a unix-seconds timestamp', () => {
    expect(fmtDate(Math.floor(Date.parse('2026-03-01T00:00:00Z') / 1000))).toContain('2026')
  })

  it('fmtDateTime keeps the time of day (per-second precision)', () => {
    const out = fmtDateTime(Math.floor(Date.parse('2026-03-01T14:05:32Z') / 1000))
    expect(out).toContain('2026')
    expect(out).toMatch(/\d{2}:\d{2}:\d{2}/) // HH:mm:ss present
  })
})

describe('presentSummaryCards / presentBanner', () => {
  const acc = books()

  it('derives the five metric cards from the live roll-up', () => {
    const cards = presentSummaryCards(acc.summary, acc.incomeStatement, acc.balanceSheet)
    expect(cards.map((c) => c.label)).toEqual([
      'Net income',
      'Total revenue',
      'Total expenses',
      'Total assets',
      'Total equity'
    ])
    expect(cards.find((c) => c.label === 'Total revenue')?.value).toBe('$100.00')
    expect(cards.find((c) => c.label === 'Total expenses')?.value).toBe('$30.00')
  })

  it('reports the balanced banner with the live identity figures', () => {
    const banner = presentBanner(acc.balanceSheet, acc.generalLedger)
    expect(banner.balanced).toBe(true)
    expect(banner.identity).toContain('=')
    expect(banner.trial).toMatch(/Dr .* = Cr/)
  })
})

describe('presentIncome', () => {
  it('lists revenue and expense lines for the full period', () => {
    const income = presentIncome(books().entries)
    expect(income.revLines).toContainEqual({ label: 'Service Revenue', value: '$100.00' })
    expect(income.expLines).toContainEqual({ label: 'Operating Expense', value: '$30.00' })
    expect(income.netIncome).toBe('$70.00')
  })

  it('narrows to a reporting period', () => {
    // Window that excludes the ts=200 expense, keeping only the ts=100 revenue.
    const income = presentIncome(books().entries, new Date(50_000), new Date(150_000))
    expect(income.totalRevenue).toBe('$100.00')
    expect(income.totalExpenses).toBe('$0.00')
  })
})

describe('presentBalance', () => {
  it('rolls cash into a single line plus equity breakdown', () => {
    const balance = presentBalance(books().entries)
    expect(balance.assetLines[0].label).toBe('Cash (all pockets)')
    expect(balance.equityLines.map((l) => l.label)).toEqual([
      'Owner capital',
      'Investor equity (SHER)',
      'Retained earnings (net profit)'
    ])
    expect(balance.liabLines).toContainEqual({ label: 'None (no debt)', value: '$0.00' })
  })
})

describe('presentTrial', () => {
  it('puts each account balance on its normal side and stays balanced', () => {
    const trial = presentTrial(books().generalLedger)
    expect(trial.balanced).toBe(true)
    const revenue = trial.rows.find((r) => r.account === 'Service Revenue')
    expect(revenue?.nature).toBe('Income')
    expect(revenue?.cr).toBe('$100.00') // income is credit-normal
    expect(revenue?.dr).toBe('—')
  })
})

describe('presentLedger', () => {
  it('emits two rows per posting and counts entries (not rows)', () => {
    const ledger = presentLedger(books().entries, 'All')
    expect(ledger.entryCount).toBe(2)
    expect(ledger.rows).toHaveLength(4)
    // First leg carries the date + label; the credit leg is blanked.
    expect(ledger.rows[0].isFirst).toBe(true)
    expect(ledger.rows[1].isFirst).toBe(false)
  })

  it('filters by category', () => {
    const ledger = presentLedger(books().entries, 'Revenue')
    expect(ledger.entryCount).toBe(1)
    expect(ledger.rows[0].cat).toBe('Revenue')
  })

  it('labels the transaction by its accounting entry, not the raw memo', () => {
    const ledger = presentLedger(books().entries, 'Revenue')
    expect(ledger.rows[0].label).toBe('Service revenue') // normalized UC-BANK-02 label
  })

  it('leaves the human-readable activity empty without a name resolver', () => {
    const ledger = presentLedger(books().entries, 'Revenue')
    expect(ledger.rows[0].activity).toBe('')
  })

  it('adds a human-readable activity without touching the accounting label', () => {
    const nameOf = makeNameResolver([{ address: ADDR.client, name: 'Acme' }])
    const ledger = presentLedger(books().entries, 'Revenue', null, null, nameOf)
    expect(ledger.rows[0].label).toBe('Service revenue') // accounting label unchanged
    expect(ledger.rows[0].activity).toBe('Acme paid $100.00 for services')
    expect(ledger.rows[1].activity).toBe('') // credit leg stays blank
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
