import { describe, it, expect } from 'vitest'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const GEORGES = '0x1111111111111111111111111111111111111111'
const RAVI = '0x2222222222222222222222222222222222222222'

const base = {
  token: 'usdc' as const,
  rate: 1,
  internal: false,
  enrichment: 'not-applicable' as const,
  creditOfferId: '1',
  memo: ''
}

/** A lender's $800 deposit into round #1 and the $80 fixed return it earns. */
const deposit = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  id: 'fl1',
  timestamp: 100,
  useCase: 'UC-CREDIT-01',
  debit: 'Cash — Credit',
  credit: 'Loan Payable',
  amountUsd: 800,
  rawAmount: '800000000',
  counterparty: GEORGES,
  ...over
})

const interestOwed = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  id: 'credit-interest-1-georges',
  timestamp: 120,
  useCase: 'UC-CREDIT-05',
  debit: 'Interest Expense',
  credit: 'Interest Payable',
  amountUsd: 80,
  rawAmount: '80000000',
  counterparty: GEORGES,
  ...over
})

const principalBack = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  id: 'rp1-principal',
  timestamp: 900,
  useCase: 'UC-CREDIT-03',
  debit: 'Loan Payable',
  credit: 'Cash — Bank',
  amountUsd: 800,
  rawAmount: '800000000',
  counterparty: GEORGES,
  ...over
})

const interestPaid = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  id: 'rp1-interest',
  timestamp: 900,
  useCase: 'UC-CREDIT-03',
  debit: 'Interest Payable',
  credit: 'Cash — Bank',
  amountUsd: 80,
  rawAmount: '80000000',
  counterparty: GEORGES,
  ...over
})

/** `[account, debit, credit]` per rendered row — the shape of the posting. */
const shape = (rows: ReturnType<typeof ledgerRows>) => rows.map((r) => [r.account, r.dr, r.cr])

describe('credit grouping', () => {
  it('renders a lender funding a round on four lines, one posting', () => {
    const rows = ledgerRows([deposit(), interestOwed()])
    expect(shape(rows)).toEqual([
      ['Cash — Credit', '$800.00', ''],
      ['Loan Payable', '', '$800.00'],
      ['Interest Expense', '$80.00', ''],
      ['Interest Payable', '', '$80.00']
    ])
    // A single head: the deposit's date, badge and label lead the posting.
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    expect(rows[0]?.label).toBe('Credit funds lent')
    expect(rows[0]?.cat).toBe('Credit')
  })

  it('names both the loan and the interest in the funding narration', () => {
    const [head] = ledgerRows([deposit(), interestOwed()])
    expect(head?.activity).toEqual({
      kind: 'actor',
      actor: GEORGES,
      text: 'lent $800.00 to the community credit · $80.00 of interest owed'
    })
  })

  it('renders a repayment on three lines, the two debits on one cash credit', () => {
    const rows = ledgerRows([principalBack(), interestPaid()])
    expect(shape(rows)).toEqual([
      ['Loan Payable', '$800.00', ''],
      ['Interest Payable', '$80.00', ''],
      // One aggregated cash line for the gross $880 that actually left the Bank.
      ['Cash — Bank', '', '$880.00']
    ])
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    expect(rows[0]?.label).toBe('Credit repayment')
  })

  it('leads a repayment with the principal even when the feed lists interest first', () => {
    const rows = ledgerRows([interestPaid(), principalBack()])
    expect(rows[0]?.account).toBe('Loan Payable')
    expect(rows[0]?.activity).toMatchObject({
      text: 'was repaid $800.00 of loan principal · $80.00 of interest'
    })
  })

  it('keeps two lenders apart, and two rounds of the same lender apart', () => {
    const rows = ledgerRows([
      deposit(),
      interestOwed(),
      deposit({ id: 'fl2', counterparty: RAVI, amountUsd: 200, rawAmount: '200000000' }),
      deposit({ id: 'fl3', creditOfferId: '2', amountUsd: 500, rawAmount: '500000000' })
    ])
    // Georges' round #1 folds to four lines; the other two stay two lines each.
    expect(rows).toHaveLength(8)
    expect(rows.filter((r) => r.isFirst)).toHaveLength(3)
  })

  it('leaves a leg that names no round or no lender as its own posting', () => {
    const orphan = interestOwed({ creditOfferId: undefined })
    const rows = ledgerRows([deposit(), orphan])
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
  })
})
