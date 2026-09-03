import { describe, it, expect } from 'vitest'
import {
  entryCurrency,
  ledgerCurrencies,
  filterLedgerByCurrency,
  filterLedgerEntries,
  presentLedger,
  FEE_ACCOUNT,
  FEE_FILTER
} from '@/utils/accounting/ledgerPresenter'
import type { LedgerEntry } from '@/utils/accounting/ledgerEntry'

const base = {
  useCase: 'INTERNAL' as const,
  debit: 'Cash — Expense' as const,
  credit: 'Cash — Bank' as const,
  amountUsd: 10,
  rawAmount: '10000000',
  memo: '',
  enrichment: 'not-applicable' as const
}

const usdtEntry: LedgerEntry = { ...base, id: 'usdt', timestamp: 300, token: 'usdt' }
const usdcEntry: LedgerEntry = { ...base, id: 'usdc', timestamp: 200, token: 'usdc' }
const usdcEntry2: LedgerEntry = { ...base, id: 'usdc-2', timestamp: 100, token: 'usdc' }

// A transfer whose in-tx Bank fee was skimmed in a different token than the move.
const feeInSher: LedgerEntry = {
  ...base,
  id: 'xfer-fee',
  timestamp: 400,
  token: 'usdc',
  mergedBankFee: { amountUsd: 0.05, rawAmount: '50000000000000000', token: 'sher' }
}

describe('entryCurrency', () => {
  it('reads the transaction token — the fee leg token never overrides it', () => {
    expect(entryCurrency(usdtEntry)).toBe('USDT')
    expect(entryCurrency(usdcEntry)).toBe('USDC')
    // A transfer that skimmed its fee in another token is still the transfer's own
    // currency — the whole transaction is kept in view, not a fee-only leg.
    expect(entryCurrency(feeInSher)).toBe('USDC')
  })
})

describe('ledgerCurrencies', () => {
  it('lists the distinct currencies in view, sorted, de-duplicated', () => {
    expect(ledgerCurrencies([usdtEntry, usdcEntry, usdcEntry2])).toEqual(['USDC', 'USDT'])
  })

  it('collapses to a single currency when only one is present', () => {
    expect(ledgerCurrencies([usdcEntry, usdcEntry2])).toEqual(['USDC'])
  })

  it('is empty for no entries', () => {
    expect(ledgerCurrencies([])).toEqual([])
  })
})

describe('filterLedgerByCurrency', () => {
  it('keeps only entries whose currency is selected', () => {
    const kept = filterLedgerByCurrency([usdtEntry, usdcEntry, usdcEntry2], ['USDC'])
    expect(kept.map((e) => e.id)).toEqual(['usdc', 'usdc-2'])
  })

  it('keeps none for an empty selection (mirrors the multi-select)', () => {
    expect(filterLedgerByCurrency([usdtEntry, usdcEntry], [])).toHaveLength(0)
  })
})

describe('currency filter threaded through the funnel', () => {
  const all = [usdtEntry, usdcEntry, usdcEntry2]

  it('filterLedgerEntries narrows by currency alongside category + date', () => {
    const rows = filterLedgerEntries(all, 'All', null, null, ['USDT'])
    expect(rows.map((e) => e.id)).toEqual(['usdt'])
  })

  it('a null / absent currency selection leaves the set untouched', () => {
    expect(filterLedgerEntries(all, 'All')).toHaveLength(3)
    expect(filterLedgerEntries(all, 'All', null, null, null)).toHaveLength(3)
  })

  it('presentLedger honours the currency selection for the export path', () => {
    const view = presentLedger(all, 'All', null, null, ['USDC'])
    expect(view.entryCount).toBe(2)
    expect(view.rows.every((r) => !r.isFee)).toBe(true)
  })
})

describe('currency filter under the Fee filter', () => {
  const standaloneFee: LedgerEntry = {
    ...base,
    id: 'fee-1',
    timestamp: 500,
    useCase: 'FEE',
    debit: FEE_ACCOUNT,
    credit: 'Cash — Bank',
    amountUsd: 0.5,
    token: 'usdt'
  }

  it('keys fee-bearing entries off their transaction currency, keeping every leg', () => {
    // The fee view narrows to whole transactions touching Transaction Fee Expense,
    // so the currency selector reads the transaction token — feeInSher is USDC (its
    // fee leg's SHER never overrides it), the standalone fee is USDT.
    const view = presentLedger([standaloneFee, feeInSher], FEE_FILTER, null, null, ['USDC'])
    expect(view.entryCount).toBe(1)
    // The selected transaction still renders its full balanced context (Dr net · Dr
    // fee · Cr gross), not a fee-only line.
    expect(view.rows).toHaveLength(3)
    expect(view.rows.some((r) => r.isFee)).toBe(true)
    // The lead row carries the transaction's own currency (the fee leg keeps its
    // SHER movement below, but that never drives the selector).
    expect(view.rows[0].currency).toBe('USDC')
  })
})
