import { describe, it, expect } from 'vitest'
import { money, presentSummaryCards, presentBanner } from '@/utils/accounting/presenter'
import { accountFor } from '@/utils/accounting/accountRegistry'
import { sampleBooks } from './fixtures'

describe('presentSummaryCards / presentBanner', () => {
  const acc = sampleBooks()

  it('derives the metric cards from the live roll-up', () => {
    const cards = presentSummaryCards(acc.summary, acc.incomeStatement, acc.balanceSheet)
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
    expect(cards.find((c) => c.label === 'Total transaction fees')?.value).toBe(
      money(acc.summary.transactionFees)
    )
    // These books carry no borrowing, so there is nothing outstanding.
    expect(cards.find((c) => c.label === 'Outstanding debt')?.value).toBe('$0.00')
  })

  it('adds up the credit liabilities into the outstanding-debt card', () => {
    const cards = presentSummaryCards(acc.summary, acc.incomeStatement, {
      ...acc.balanceSheet,
      liabilities: [
        {
          account: accountFor('Loan Payable'),
          accountLabel: 'Loan Payable',
          balance: 1000,
          contribution: 1000
        },
        {
          account: accountFor('Interest Payable'),
          accountLabel: 'Interest Payable',
          balance: 100,
          contribution: 100
        },
        // A liability outside the borrowing accounts stays out of the figure.
        {
          account: accountFor('Wage Payable'),
          accountLabel: 'Wage Payable',
          balance: 40,
          contribution: 40
        }
      ]
    })
    expect(cards.find((c) => c.label === 'Outstanding debt')?.value).toBe('$1,100.00')
  })

  it('shows the debt-repaid card only once a lender has been paid back', () => {
    const cards = presentSummaryCards(
      { ...acc.summary, debtRepaid: 880 },
      acc.incomeStatement,
      acc.balanceSheet
    )
    expect(cards.find((c) => c.label === 'Debt repaid')?.value).toBe('$880.00')
    // Eight metrics — two full rows of four.
    expect(cards).toHaveLength(8)
  })

  it('reports the balanced banner with the live identity figures', () => {
    const banner = presentBanner(acc.balanceSheet, acc.generalLedger)
    expect(banner.balanced).toBe(true)
    expect(banner.identity).toContain('=')
    expect(banner.trial).toMatch(/Dr .* = Cr/)
  })

  it('identity string foots exactly: Assets = Liabilities + Equity, to the cent', () => {
    const banner = presentBanner(acc.balanceSheet, acc.generalLedger)
    // Parse "$A = $L + $E" and assert L + E === A on the *displayed* cents.
    const cents = (s: string): number => Math.round(parseFloat(s.replace(/[$,]/g, '')) * 100)
    const [lhs, rhs] = banner.identity.split(' = ')
    const [liab, equity] = rhs!.split(' + ')
    expect(cents(liab!) + cents(equity!)).toBe(cents(lhs!))
  })
})
