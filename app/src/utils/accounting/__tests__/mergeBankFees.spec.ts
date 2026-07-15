import { describe, it, expect } from 'vitest'
import { mergeBankFees, txHashOf } from '@/utils/accounting/mergeBankFees'
import { presentLedger } from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

/** A Bank transfer to the payroll pocket (emits the NET amount, spec §4). */
function transfer(id: string, over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id,
    timestamp: 100,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    amountUsd: 2,
    token: 'usdc',
    rawAmount: '2000000',
    rate: 1,
    internal: true,
    memo: 'Fund Cash — Payroll from Bank',
    enrichment: 'not-applicable',
    ...over
  }
}

/** The protocol fee skimmed to the FeeCollector (Dr Transaction Fee Expense). */
function fee(id: string, over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id,
    timestamp: 100,
    useCase: 'FEE',
    debit: 'Transaction Fee Expense',
    credit: 'Cash — Bank',
    amountUsd: 0.5,
    token: 'usdc',
    rawAmount: '500000',
    rate: 1,
    internal: false,
    memo: 'Transaction fee skimmed from Bank',
    enrichment: 'not-applicable',
    ...over
  }
}

describe('txHashOf', () => {
  it('strips the -logIndex suffix off an indexed-event id', () => {
    expect(txHashOf(transfer('0xabc-5'))).toBe('0xabc')
  })

  it('returns the whole id when there is no suffix', () => {
    expect(txHashOf(transfer('accrual-1-cash'))).toBe('accrual-1')
    expect(txHashOf(transfer('plain'))).toBe('plain')
  })
})

describe('mergeBankFees', () => {
  it('folds a fee into the transfer skimmed in the same transaction', () => {
    const merged = mergeBankFees([transfer('0xabc-5'), fee('0xabc-3')])
    expect(merged).toHaveLength(1) // the standalone fee posting is gone
    expect(merged[0]).toMatchObject({
      id: '0xabc-5',
      mergedBankFee: { amountUsd: 0.5, rawAmount: '500000', token: 'usdc', rate: 1 }
    })
  })

  it('keeps a fee standalone when its transfer is in another transaction', () => {
    const merged = mergeBankFees([transfer('0xaaa-1'), fee('0xbbb-1')])
    expect(merged).toHaveLength(2)
    expect(merged.some((e) => e.mergedBankFee)).toBe(false)
  })

  it('leaves a feed without any Bank fee untouched', () => {
    const entries = [transfer('0xabc-5')]
    expect(mergeBankFees(entries)).toEqual(entries)
  })
})

describe('presentLedger — compound transfer + fee entry', () => {
  it('renders one entry of three lines: net debit · fee debit · gross credit', () => {
    const ledger = presentLedger([transfer('0xabc-5'), fee('0xabc-3')], 'All')
    // One compound entry, not two separate postings.
    expect(ledger.entryCount).toBe(1)
    expect(ledger.rows.map((r) => r.account)).toEqual([
      'Cash — Payroll',
      'Transaction Fee Expense',
      'Cash — Bank'
    ])
    expect(ledger.rows[0]).toMatchObject({ isFirst: true, dr: '$2.00', cr: '' })
    expect(ledger.rows[1]).toMatchObject({
      isFirst: false,
      dr: '$0.50',
      cr: '',
      currency: 'USDC',
      quantity: '0.5' // the fee's own token quantity is shown
    })
    expect(ledger.rows[2]).toMatchObject({ isFirst: false, dr: '', cr: '$2.50' }) // gross = net + fee
    // Total movements counts the fee once (net + fee), never twice.
    expect(ledger.total).toBe('$2.50')
  })

  it('still shows two separate entries when the fee is not merged', () => {
    const ledger = presentLedger([transfer('0xaaa-1'), fee('0xbbb-1')], 'All')
    expect(ledger.entryCount).toBe(2)
    expect(ledger.rows).toHaveLength(4)
  })
})
