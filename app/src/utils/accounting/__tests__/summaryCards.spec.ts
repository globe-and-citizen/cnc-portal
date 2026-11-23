import { describe, it, expect } from 'vitest'
import { presentSummary } from '@/utils/accounting/presenter'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import type { AccountName } from '@/utils/accounting/chartOfAccounts'
import type { JournalEntryDraft } from '@/utils/accounting/journalEntryDraft'
import { sampleBooks } from './fixtures'

function posting(
  id: string,
  debit: AccountName,
  credit: AccountName,
  amount: number,
  useCase: JournalEntryDraft['useCase'] = 'UC-CREDIT-01'
): JournalEntryDraft {
  return {
    id,
    timestamp: 300,
    useCase,
    debit,
    credit,
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
    const debtJournal = finalizeJournal([
      posting('loan', 'Cash — Bank', 'Loan Payable', 1000),
      posting('interest', 'Cash — Bank', 'Interest Payable', 100),
      // A liability outside the borrowing accounts stays out of the figure.
      posting('wage', 'Cash — Bank', 'Wage Payable', 40)
    ])
    const { cards } = presentSummary([...acc.journal, ...debtJournal])
    expect(cards.find((c) => c.label === 'Outstanding debt')?.value).toBe('$1,100.00')
  })

  it('shows the debt-repaid card only once a lender has been paid back', () => {
    const repayment = finalizeJournal([
      posting('repayment', 'Loan Payable', 'Cash — Bank', 880, 'UC-CREDIT-03')
    ])
    const { cards } = presentSummary([...acc.journal, ...repayment])
    expect(cards.find((c) => c.label === 'Debt repaid')?.value).toBe('$880.00')
    // Eight metrics — two full rows of four.
    expect(cards).toHaveLength(8)
  })

  describe('[AC-US-ACCT-004-11] over a reporting period', () => {
    const journal = finalizeJournal([
      { ...posting('old', 'Cash — Bank', 'Service Revenue', 100), timestamp: 100 },
      { ...posting('inside', 'Cash — Bank', 'Service Revenue', 40), timestamp: 300 },
      { ...posting('later', 'Cash — Bank', 'Service Revenue', 7), timestamp: 500 }
    ])
    const { cards, banner } = presentSummary(journal, new Date(200_000), new Date(400_000))
    const cardValue = (label: string) => cards.find((card) => card.label === label)?.value

    it('limits revenue to the period', () => {
      expect(cardValue('Total revenue')).toBe('$40.00')
    })

    it('accumulates balances up to the end of the period', () => {
      expect(cardValue('Total assets')).toBe('$140.00')
      expect(banner.balanced).toBe(true)
    })
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
