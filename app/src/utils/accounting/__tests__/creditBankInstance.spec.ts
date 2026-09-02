import { describe, it, expect } from 'vitest'
import { attachCreditBankInstances } from '@/utils/accounting/creditBankInstance'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { Address } from 'viem'

const BANK1 = '0x1111111111111111111111111111111111111111' as Address
const BANK2 = '0x2222222222222222222222222222222222222222' as Address

/** A Bank leg carrying its deployment — the timeline the credit sweep reads. */
function bankMove(id: string, instance: Address, timestamp: number): LedgerEntry {
  return {
    id,
    timestamp,
    useCase: 'UC-BANK-03',
    debit: 'Cash — Payroll',
    credit: 'Cash — Bank',
    creditInstance: instance,
    amountUsd: 1,
    token: 'usdc',
    rawAmount: '1000000',
    internal: true,
    memo: 'Fund pocket from Bank',
    enrichment: 'not-applicable'
  }
}

/** A funded Community Credit round — the sweep to Bank, booked with no instance. */
function creditFunded(id: string, timestamp: number): LedgerEntry {
  return {
    id,
    timestamp,
    useCase: 'UC-CREDIT-01',
    debit: 'Cash — Bank',
    credit: 'Loan Payable',
    amountUsd: 5,
    token: 'usdc',
    rawAmount: '5000000',
    internal: false,
    memo: 'Loan received',
    enrichment: 'not-applicable'
  }
}

describe('attachCreditBankInstances', () => {
  it('places a credit sweep on the Bank live at its time (a redeployed Bank)', () => {
    const out = attachCreditBankInstances([
      bankMove('b1', BANK1, 100),
      bankMove('b2', BANK2, 200),
      creditFunded('c1', 300)
    ])
    expect(out.find((e) => e.id === 'c1')?.debitInstance).toBe(BANK2)
  })

  it('places a sweep on the earlier Bank when the later one is not yet active', () => {
    const out = attachCreditBankInstances([
      bankMove('b1', BANK1, 100),
      bankMove('b2', BANK2, 200),
      creditFunded('c1', 150)
    ])
    expect(out.find((e) => e.id === 'c1')?.debitInstance).toBe(BANK1)
  })

  it('scopes a repayment leg (credit side) to the active Bank too', () => {
    const repay: LedgerEntry = {
      id: 'r1',
      timestamp: 400,
      useCase: 'UC-CREDIT-03',
      debit: 'Loan Payable',
      credit: 'Cash — Bank',
      amountUsd: 5,
      token: 'usdc',
      rawAmount: '5000000',
      internal: false,
      memo: 'Principal repaid',
      enrichment: 'not-applicable'
    }
    const out = attachCreditBankInstances([
      bankMove('b1', BANK1, 100),
      bankMove('b2', BANK2, 200),
      repay
    ])
    expect(out.find((e) => e.id === 'r1')?.creditInstance).toBe(BANK2)
  })

  it('leaves the leg alone when the Bank was never redeployed', () => {
    const out = attachCreditBankInstances([bankMove('b1', BANK1, 100), creditFunded('c1', 300)])
    expect(out.find((e) => e.id === 'c1')?.debitInstance).toBeUndefined()
  })

  it('never overwrites an instance the mapper already knew', () => {
    const funded = { ...creditFunded('c1', 300), debitInstance: BANK1 }
    const out = attachCreditBankInstances([
      bankMove('b1', BANK1, 100),
      bankMove('b2', BANK2, 200),
      funded
    ])
    expect(out.find((e) => e.id === 'c1')?.debitInstance).toBe(BANK1)
  })
})
