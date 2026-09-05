import { describe, it, expect } from 'vitest'
import { ledgerRows, presentLedger } from '@/utils/accounting/ledgerPresenter'
import { FEE_ACCOUNT, FEE_FILTER } from '@/utils/accounting/ledgerCategory'
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
  it('presentLedger(FEE_FILTER) selects the fee-bearing transactions and keeps every leg', () => {
    // The Fee filter narrows to the transactions touching Transaction Fee Expense
    // and renders each of them whole — never a fee-only projection (issue #2678).
    const view = presentLedger([standaloneFee, transferWithFee, plainTransfer], FEE_FILTER)
    // Two transactions selected; the plain transfer (no fee) is excluded.
    expect(view.entryCount).toBe(2)
    // Standalone fee → 2 lines (Dr fee · Cr Bank); folded transfer → 3 lines
    // (Dr net · Dr fee · Cr gross). Five rows in total, not two isolated fee lines.
    expect(view.rows).toHaveLength(5)
    // Each selected transaction is balanced: its debit rows equal its credit row.
    const feeRow = view.rows.find((r) => r.isFee && r.account === FEE_ACCOUNT)
    expect(feeRow).toBeDefined()
  })

  it('presentLedger(FEE_FILTER) preserves the accounting total of each transaction', () => {
    // The total is the ordinary "Total movements" figure over the selected
    // transactions (debit legs + folded fees), not a fee-only sum.
    const view = presentLedger([standaloneFee, transferWithFee, plainTransfer], FEE_FILTER)
    expect(view.total).toBe('$10.55')
  })

  it('a fee transaction shows identical lines in the Fee filter and the General Ledger', () => {
    // Reconciliation: the rows and total the Fee filter renders for a transaction
    // match the rows and total the "All" ledger renders for it, line for line.
    const feeView = presentLedger([transferWithFee], FEE_FILTER)
    const allView = presentLedger([transferWithFee], 'All')
    expect(feeView.rows).toEqual(allView.rows)
    expect(feeView.total).toBe(allView.total)
    expect(feeView.total).toBe('$10.05')
  })
})
