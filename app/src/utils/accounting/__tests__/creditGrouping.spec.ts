import { describe, it, expect } from 'vitest'
import { ledgerRows } from '@/utils/accounting/ledgerPresenter'
import { buildPocketInstances } from '@/utils/accounting/pocketInstances'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const GEORGES = '0x1111111111111111111111111111111111111111'
const RAVI = '0x2222222222222222222222222222222222222222'

const BANK_1 = '0xbbbb111111111111111111111111111111111111'
const BANK_2 = '0xbbbb222222222222222222222222222222222222'

const base = {
  token: 'usdc' as const,
  rate: 1,
  internal: false,
  enrichment: 'not-applicable' as const,
  creditOfferId: '1',
  memo: ''
}

/** A lender's $800 share of a funded round #1 — recognised straight to Bank —
 *  and the $80 fixed return it earns. */
const deposit = (over: Partial<LedgerEntry> = {}): LedgerEntry => ({
  ...base,
  id: 'credit-principal-1-georges',
  timestamp: 100,
  useCase: 'UC-CREDIT-01',
  debit: 'Cash — Bank',
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
  it('renders a funded round on four lines, one posting', () => {
    const rows = ledgerRows([deposit(), interestOwed()])
    expect(shape(rows)).toEqual([
      ['Cash — Bank', '$800.00', ''],
      ['Interest Expense', '$80.00', ''],
      ['Loan Payable', '', '$800.00'],
      ['Interest Payable', '', '$80.00']
    ])
    // A single head: one date, one badge and one label for the whole round.
    expect(rows.filter((r) => r.isFirst)).toHaveLength(1)
    expect(rows[0]?.label).toBe('Credit loan received')
    expect(rows[0]?.cat).toBe('Credit: Loan')
  })

  it('narrates a funded round from the team side, naming the interest', () => {
    const [head] = ledgerRows([deposit(), interestOwed()])
    expect(head?.activity).toEqual({
      kind: 'plain',
      text: 'Borrowed $800.00 from 1 lender · $80.00 of interest owed'
    })
  })

  it('merges every lender of one round into a single loan', () => {
    const rows = ledgerRows([
      deposit(),
      interestOwed(),
      deposit({ id: 'fl2', counterparty: RAVI, amountUsd: 200, rawAmount: '200000000' })
    ])
    expect(shape(rows)).toEqual([
      ['Cash — Bank', '$1,000.00', ''],
      ['Interest Expense', '$80.00', ''],
      ['Loan Payable', '', '$1,000.00'],
      ['Interest Payable', '', '$80.00']
    ])
    expect(rows[0]?.activity).toMatchObject({
      text: 'Borrowed $1,000.00 from 2 lenders · $80.00 of interest owed'
    })
  })

  it('keeps two rounds apart', () => {
    const rows = ledgerRows([
      deposit(),
      deposit({ id: 'fl3', creditOfferId: '2', amountUsd: 500, rawAmount: '500000000' })
    ])
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
    expect(shape(rows)).toEqual([
      ['Cash — Bank', '$800.00', ''],
      ['Loan Payable', '', '$800.00'],
      ['Cash — Bank', '$500.00', ''],
      ['Loan Payable', '', '$500.00']
    ])
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
  })

  it('says what an installment gave back and what is left to pay', () => {
    const rows = ledgerRows([
      principalBack({ amountUsd: 300, rawAmount: '300000000', creditRemainingUsd: 580 })
    ])
    expect(rows[0]?.activity).toEqual({
      kind: 'plain',
      text: 'Repaid $300.00 to 1 lender · $580.00 still owed'
    })
  })

  it('calls the loan settled once the last installment leaves nothing owed', () => {
    const rows = ledgerRows([
      principalBack({ creditRemainingUsd: 80 }),
      interestPaid({ creditRemainingUsd: 0 })
    ])
    expect(rows[0]?.activity).toMatchObject({
      text: 'Repaid $880.00 to 1 lender · loan fully repaid'
    })
  })

  it('folds a payment run to several lenders into one posting', () => {
    const rows = ledgerRows([
      principalBack({ creditRemainingUsd: 200 }),
      principalBack({
        id: 'rp2-principal',
        counterparty: RAVI,
        amountUsd: 200,
        rawAmount: '200000000',
        creditRemainingUsd: 0
      })
    ])
    expect(shape(rows)).toEqual([
      ['Loan Payable', '$1,000.00', ''],
      ['Cash — Bank', '', '$1,000.00']
    ])
    expect(rows[0]?.activity).toMatchObject({
      text: 'Repaid $1,000.00 to 2 lenders · loan fully repaid'
    })
  })

  it('keeps two installments of one round apart', () => {
    const rows = ledgerRows([
      principalBack({ amountUsd: 300, rawAmount: '300000000', creditRemainingUsd: 580 }),
      principalBack({
        id: 'rp2-principal',
        timestamp: 1000,
        amountUsd: 500,
        rawAmount: '500000000',
        creditRemainingUsd: 80
      })
    ])
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
  })

  it('leaves a leg that names no round as its own posting', () => {
    const orphan = interestOwed({ creditOfferId: undefined })
    const rows = ledgerRows([deposit(), orphan])
    expect(rows.filter((r) => r.isFirst)).toHaveLength(2)
  })

  // A redeployed Bank: the netted Cash — Bank line of a credit round must keep the
  // deployment it settled in, so the compound posting reads "Cash — Bank 2" — like a
  // plain posting does — and the account filter can isolate that deployment.
  describe('carries the Bank deployment through the netted cash line', () => {
    // A plain deposit into the first Bank contract, so the book has two Bank
    // deployments and buildPocketInstances numbers them.
    const bankOne: LedgerEntry = {
      ...base,
      id: 'bank-1-deposit',
      timestamp: 50,
      useCase: 'UC-BANK-02',
      debit: 'Cash — Bank',
      debitInstance: BANK_1 as `0x${string}`,
      credit: 'Service Revenue',
      amountUsd: 10,
      rawAmount: '10000000',
      creditOfferId: undefined
    }

    it('labels a funded round settling in the redeployed Bank', () => {
      const feed = [bankOne, deposit({ debitInstance: BANK_2 as `0x${string}` }), interestOwed()]
      const rows = ledgerRows(feed, buildPocketInstances(feed))
      const bankRow = rows.find((r) => r.account === 'Cash — Bank' && r.dr === '$800.00')
      expect(bankRow?.accountLabel).toBe('Cash — Bank 2')
      expect(bankRow?.accountInstance).toBe(BANK_2)
    })

    it('labels a repayment leaving the redeployed Bank', () => {
      const feed = [
        bankOne,
        principalBack({ creditInstance: BANK_2 as `0x${string}` }),
        interestPaid({ creditInstance: BANK_2 as `0x${string}` })
      ]
      const rows = ledgerRows(feed, buildPocketInstances(feed))
      const bankRow = rows.find((r) => r.account === 'Cash — Bank' && r.cr === '$880.00')
      expect(bankRow?.accountLabel).toBe('Cash — Bank 2')
      expect(bankRow?.accountInstance).toBe(BANK_2)
    })
  })
})
