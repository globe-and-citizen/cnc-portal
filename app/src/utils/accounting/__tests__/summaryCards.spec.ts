import { describe, it, expect } from 'vitest'
import { presentSummary } from '@/utils/accounting/presenter'
import { buildJournal } from '@/utils/accounting/generalLedger'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import { sampleBooks } from './fixtures'

function posting(
  id: string,
  debit: AccountName,
  credit: AccountName,
  amount: number,
  useCase: LedgerEntry['useCase'] = 'UC-CREDIT-01'
): LedgerEntry {
  return {
    id,
    timestamp: 300,
    useCase,
    debit,
    credit,
    amountUsd: amount,
    token: 'usdc',
    rawAmount: String(amount * 1_000_000),
    rate: 1,
    internal: false,
    memo: '',
    enrichment: 'not-applicable'
  }
}

describe('presentSummary', () => {
  const acc = sampleBooks()

  it('derives the metric cards directly from the journal', () => {
    const { cards } = presentSummary(acc.journal)
    expect(cards.map((c) => c.label)).toEqual([
      'Net income',
      'Total revenue',
      'Total expenses',
      'Total transaction fees',
      'Total assets',
      'Total equity',
      'Outstanding debt'
      // No "Debt repaid" card: these books never paid a lender back.
    ])
    expect(cards.find((c) => c.label === 'Total revenue')?.value).toBe('$100.00')
    expect(cards.find((c) => c.label === 'Total expenses')?.value).toBe('$30.00')
    expect(cards.find((c) => c.label === 'Total transaction fees')?.value).toBe('$0.00')
    // These books carry no borrowing, so there is nothing outstanding.
    expect(cards.find((c) => c.label === 'Outstanding debt')?.value).toBe('$0.00')
  })

  it('adds up the credit liabilities into the outstanding-debt card', () => {
    const debtJournal = buildJournal([
      posting('loan', 'Cash — Bank', 'Loan Payable', 1000),
      posting('interest', 'Cash — Bank', 'Interest Payable', 100),
      // A liability outside the borrowing accounts stays out of the figure.
      posting('wage', 'Cash — Bank', 'Wage Payable', 40)
    ])
    const { cards } = presentSummary([...acc.journal, ...debtJournal])
    expect(cards.find((c) => c.label === 'Outstanding debt')?.value).toBe('$1,100.00')
  })

  it('shows the debt-repaid card only once a lender has been paid back', () => {
    const repayment = buildJournal([
      posting('repayment', 'Loan Payable', 'Cash — Bank', 880, 'UC-CREDIT-03')
    ])
    const { cards } = presentSummary([...acc.journal, ...repayment])
    expect(cards.find((c) => c.label === 'Debt repaid')?.value).toBe('$880.00')
    // Eight metrics — two full rows of four.
    expect(cards).toHaveLength(8)
  })

  it('reports the balanced banner with the live identity figures', () => {
    const { banner } = presentSummary(acc.journal)
    expect(banner.balanced).toBe(true)
    expect(banner.identity).toContain('=')
    expect(banner.trial).toMatch(/Dr .* = Cr/)
  })

  it('identity string foots exactly: Assets = Liabilities + Equity, to the cent', () => {
    const { banner } = presentSummary(acc.journal)
    // Parse "$A = $L + $E" and assert L + E === A on the *displayed* cents.
    const cents = (s: string): number => Math.round(parseFloat(s.replace(/[$,]/g, '')) * 100)
    const [lhs, rhs] = banner.identity.split(' = ')
    const [liab, equity] = rhs!.split(' + ')
    expect(cents(liab!) + cents(equity!)).toBe(cents(lhs!))
  })
})
