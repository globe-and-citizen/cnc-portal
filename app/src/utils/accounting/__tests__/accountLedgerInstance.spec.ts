import { describe, it, expect } from 'vitest'
import {
  scopedNet,
  presentAccountLedger,
  entriesForAccount,
  accountOpening
} from '@/utils/accounting/accountLedger'
import { mergeBankFees } from '@/utils/accounting/mergeBankFees'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import { money } from '@/utils/accounting/presenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'
import type { Address } from 'viem'

const BANK1 = '0x1111111111111111111111111111111111111111' as Address
const BANK2 = '0x2222222222222222222222222222222222222222' as Address

function entry(over: Partial<LedgerEntry> & Pick<LedgerEntry, 'id'>): LedgerEntry {
  return {
    timestamp: 100,
    useCase: 'UC-BANK-02',
    debit: null,
    credit: null,
    amountUsd: 0,
    token: 'usdc',
    rawAmount: '0',
    internal: false,
    memo: '',
    enrichment: 'not-applicable',
    ...over
  }
}

/**
 * A team that redeployed its Bank, then migrated its treasury: $200 seeded into
 * Bank 1, $10 into Bank 2, then Bank 1 sends $100 (net) to Bank 2 with a $0.50 fee
 * (gross $100.50 leaves Bank 1). Both transfer legs are `Cash — Bank`, on different
 * deployments — the case that used to net to nonsense in a drill-down.
 */
function migrationBook(): LedgerEntry[] {
  return [
    entry({
      id: 'seed1',
      timestamp: 50,
      debit: 'Cash — Bank',
      debitInstance: BANK1,
      credit: 'Service Revenue',
      amountUsd: 200
    }),
    entry({
      id: 'seed2',
      timestamp: 90,
      debit: 'Cash — Bank',
      debitInstance: BANK2,
      credit: 'Service Revenue',
      amountUsd: 10
    }),
    entry({
      id: '0xabc-5',
      timestamp: 100,
      useCase: 'UC-BANK-03',
      debit: 'Cash — Bank',
      debitInstance: BANK2,
      credit: 'Cash — Bank',
      creditInstance: BANK1,
      amountUsd: 100,
      internal: true
    }),
    entry({
      id: '0xabc-3',
      timestamp: 100,
      useCase: 'FEE',
      debit: 'Transaction Fee Expense',
      credit: 'Cash — Bank',
      creditInstance: BANK1,
      amountUsd: 0.5
    })
  ]
}

describe('accountLedger — a redeployed Bank with an internal Bank → Bank transfer', () => {
  const book = migrationBook()
  const gl = buildGeneralLedger(book)
  const rowBalance = (instance: Address): number =>
    gl.trialBalance.find(
      (r) => r.account === 'Cash — Bank' && r.instance?.toLowerCase() === instance
    )?.balance ?? NaN

  it('nets each deployment on its own instance (the two legs do not cancel)', () => {
    // Bank 1: $200 in, $100.50 out (gross) → $99.50. Bank 2: $10 + $100 in → $110.
    const bank1 = mergeBankFees(
      entriesForAccount(book, 'Cash — Bank', null, null, { instance: BANK1, includeBlank: true })
    )
    const bank2 = mergeBankFees(
      entriesForAccount(book, 'Cash — Bank', null, null, { instance: BANK2 })
    )
    expect(scopedNet(bank1, 'Cash — Bank', { instance: BANK1, includeBlank: true })).toBe(99.5)
    expect(scopedNet(bank2, 'Cash — Bank', { instance: BANK2 })).toBe(110)
  })

  it('reconciles each drill-down total with its trial-balance line', () => {
    const bank1 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK1,
      includeBlank: true
    })
    const bank2 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK2
    })
    expect(bank1.total).toBe(money(rowBalance(BANK1)))
    expect(bank1.total).toBe(money(99.5))
    expect(bank2.total).toBe(money(rowBalance(BANK2)))
    expect(bank2.total).toBe(money(110))
  })

  it('shows the fee leg on both sides of the transfer, as the general ledger does', () => {
    // The transfer-with-fee reads as the same compound entry everywhere it appears:
    // the sender's drill-down and the receiver's alike show the Transaction Fee
    // Expense leg, matching the general-ledger journal (drill-down parity).
    const bank1 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK1,
      includeBlank: true
    })
    const bank2 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK2
    })
    expect(bank1.rows.some((r) => r.account === 'Transaction Fee Expense')).toBe(true)
    expect(bank2.rows.some((r) => r.account === 'Transaction Fee Expense')).toBe(true)
  })

  it('nets the fee only against the Bank that paid it, so the receiver is unchanged', () => {
    // Bank 1 (sender) carries the $0.50 fee into its balance ($99.50); Bank 2
    // (receiver) shows the leg but keeps its $110 — the fee never touches it.
    const bank1 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK1,
      includeBlank: true
    })
    const bank2 = presentAccountLedger(book, 'Cash — Bank', null, null, undefined, {
      instance: BANK2
    })
    expect(bank1.total).toBe(money(99.5))
    expect(bank2.total).toBe(money(110))
  })

  it('brings only the scoped deployment forward in the opening balance', () => {
    // A window opening after the seeds but before the transfer carries Bank 1's
    // $200 seed alone — not Bank 2's, nor the whole account's $210.
    const from = new Date(95 * 1000)
    const opening = accountOpening(book, 'Cash — Bank', from, {
      instance: BANK1,
      includeBlank: true
    })
    expect(opening.balance).toBe(200)
    expect(opening.debits).toBe(200)
  })
})
