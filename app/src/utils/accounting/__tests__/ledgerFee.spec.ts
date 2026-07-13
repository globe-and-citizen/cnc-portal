import { describe, it, expect } from 'vitest'
import {
  ledgerRows,
  entryHasFee,
  ledgerFeeRows,
  ledgerFeeTotal,
  presentLedger,
  FEE_ACCOUNT,
  FEE_FILTER
} from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

// A standalone fee posting (its transfer isn't in view, so it stays on its own).
const standaloneFee: LedgerEntry = {
  id: 'fee-1',
  timestamp: 100,
  useCase: 'FEE',
  debit: FEE_ACCOUNT,
  credit: 'Cash — Bank',
  amountUsd: 0.5,
  token: 'usdc',
  rawAmount: '500000',
  memo: 'Transaction fee skimmed from Bank',
  enrichment: 'not-applicable'
}

// A transfer that skimmed a fee in the same tx: the fee is folded onto the
// outflow as `mergedBankFee` (what mergeBankFees produces).
const transferWithFee: LedgerEntry = {
  id: 'xfer-1',
  timestamp: 200,
  useCase: 'INTERNAL',
  debit: 'Cash — Expense',
  credit: 'Cash — Bank',
  amountUsd: 10,
  token: 'usdc',
  rawAmount: '10000000',
  memo: '',
  enrichment: 'not-applicable',
  mergedBankFee: { amountUsd: 0.05, rawAmount: '50000', token: 'usdc' }
}

const plainTransfer: LedgerEntry = {
  id: 'xfer-2',
  timestamp: 300,
  useCase: 'INTERNAL',
  debit: 'Cash — Expense',
  credit: 'Cash — Bank',
  amountUsd: 20,
  token: 'usdc',
  rawAmount: '20000000',
  memo: '',
  enrichment: 'not-applicable'
}

describe('Fee badge (isFee row flag)', () => {
  it('flags the Transaction Fee Expense leg — standalone posting', () => {
    // Its single debit row is the fee leg.
    expect(ledgerRows([standaloneFee])[0].isFee).toBe(true)
  })

  it('flags only the fee leg of a folded transfer (Dr net · Dr fee · Cr gross)', () => {
    const rows = ledgerRows([transferWithFee])
    expect(rows.map((r) => Boolean(r.isFee))).toEqual([false, true, false])
    expect(rows[1].account).toBe(FEE_ACCOUNT)
  })

  it('leaves non-fee rows unflagged', () => {
    expect(ledgerRows([plainTransfer]).every((r) => !r.isFee)).toBe(true)
  })
})

describe('Fee filter', () => {
  it('entryHasFee matches folded and standalone fees only', () => {
    expect(entryHasFee(standaloneFee)).toBe(true)
    expect(entryHasFee(transferWithFee)).toBe(true)
    expect(entryHasFee(plainTransfer)).toBe(false)
  })

  it('ledgerFeeRows isolates one contextual fee line per fee-bearing entry', () => {
    const rows = ledgerFeeRows([standaloneFee, transferWithFee, plainTransfer])
    expect(rows).toHaveLength(2)
    expect(rows.every((r) => r.isFee && r.account === FEE_ACCOUNT)).toBe(true)
    // The folded fee shows the fee amount ($0.05), not the transfer's $10.
    expect(rows[1].dr).toBe('$0.05')
    // The line keeps its date so it still reads in isolation.
    expect(rows[1].isFirst).toBe(true)
    expect(rows[1].date).not.toBe('')
  })

  it('ledgerFeeTotal sums only the fee legs', () => {
    expect(ledgerFeeTotal([standaloneFee, transferWithFee, plainTransfer])).toBe('$0.55')
  })

  it('presentLedger(FEE_FILTER) isolates fees — the on-screen + print/export funnel', () => {
    const view = presentLedger([standaloneFee, transferWithFee, plainTransfer], FEE_FILTER)
    expect(view.entryCount).toBe(2)
    expect(view.rows).toHaveLength(2)
    expect(view.rows.every((r) => r.isFee)).toBe(true)
    expect(view.total).toBe('$0.55')
  })
})
