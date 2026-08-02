import { describe, it, expect } from 'vitest'
import { activityDestinationOf } from '../activityDestination'
import type { LedgerEntry } from '../ledgerEntry'

const ALI = '0x1111111111111111111111111111111111111111'

/** A minimal balanced entry; override only what each case needs. */
function entry(partial: Partial<LedgerEntry>): LedgerEntry {
  return {
    id: 'e1',
    timestamp: 1_700_000_000,
    useCase: 'CASH-IN',
    debit: 'Cash — Bank',
    credit: 'Service Revenue',
    amountUsd: 500,
    token: 'usdc',
    rawAmount: '500000000',
    internal: false,
    memo: 'raw memo',
    enrichment: 'not-applicable',
    ...partial
  }
}

describe('activityDestinationOf — use cases with their own surface', () => {
  it('sends a wage to the member it belongs to', () => {
    expect(
      activityDestinationOf(
        entry({
          useCase: 'UC-CASH-03',
          counterparty: ALI,
          debit: 'Wage Payable',
          credit: 'Cash — Payroll'
        })
      )
    ).toMatchObject({ section: 'payroll-history', memberAddress: ALI })
  })

  it('falls back to the Payroll Account when the wage names no member', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-CASH-02', debit: 'Payroll Expense', credit: 'Wage Payable' })
      )
    ).toMatchObject({ section: 'payroll' })
  })

  it('sends a credit posting to its own round', () => {
    expect(
      activityDestinationOf(
        entry({
          useCase: 'UC-CREDIT-03',
          creditOfferId: '7',
          debit: 'Loan Payable',
          credit: 'Cash — Bank'
        })
      )
    ).toMatchObject({ section: 'credit-round', roundId: '7' })
  })

  it('falls back to the rounds list when the credit leg names no round', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-CREDIT-01', debit: 'Cash — Credit', credit: 'Loan Payable' })
      )
    ).toMatchObject({ section: 'community-credit' })
  })

  it('sends share issuance and dividends to the SHER Token page', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'DEFAULT-D', debit: 'Shares to be issued', credit: 'Investor Equity' })
      )
    ).toMatchObject({ section: 'sher-token' })
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-INV-01', debit: 'Dividend Expense', credit: 'Cash — Bank' })
      )
    ).toMatchObject({ section: 'sher-token' })
  })
})

describe('activityDestinationOf — falling back to the cash pocket', () => {
  it('follows the credited (source) pocket on an internal move', () => {
    // Bank funds Payroll: the move was made from the Bank, so that is where it happened.
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-BANK-03', debit: 'Cash — Payroll', credit: 'Cash — Bank' })
      )
    ).toMatchObject({ section: 'bank' })
  })

  it('follows the debited pocket when the credit leg is not one', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-SDR-01', debit: 'Cash — Safe', credit: 'Investor Equity' })
      )
    ).toMatchObject({ section: 'safe' })
  })

  it('sends an expense payout to the Expense Account', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'UC-EXP-01', debit: 'Operating Expense', credit: 'Cash — Expense' })
      )
    ).toMatchObject({ section: 'expense' })
  })

  it('sends a protocol fee to the pocket it was skimmed from', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'FEE', debit: 'Transaction Fee Expense', credit: 'Cash — Bank' })
      )
    ).toMatchObject({ section: 'bank' })
  })

  it('has nowhere to send a posting that touches no team pocket', () => {
    expect(
      activityDestinationOf(
        entry({ useCase: 'CASH-IN', debit: 'Retained Earnings', credit: 'Service Revenue' })
      )
    ).toBeNull()
    // The FeeCollector is protocol-wide, not a team surface.
    expect(
      activityDestinationOf(
        entry({
          useCase: 'FEE',
          debit: 'Cash — FeeCollector',
          credit: 'Transaction Fee Expense'
        })
      )
    ).toBeNull()
    // A memo-only posting has no legs at all.
    expect(
      activityDestinationOf(entry({ useCase: 'CASH-IN', debit: null, credit: null }))
    ).toBeNull()
  })

  it('carries a label for every destination it returns', () => {
    const destination = activityDestinationOf(
      entry({ useCase: 'UC-EXP-01', debit: 'Operating Expense', credit: 'Cash — Expense' })
    )
    expect(destination?.label).toBe('Open the Expense Account')
  })
})
