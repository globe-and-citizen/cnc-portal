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
  it('reads the entry token by default, the fee leg token under the Fee filter', () => {
    expect(entryCurrency(usdtEntry)).toBe('USDT')
    expect(entryCurrency(usdcEntry)).toBe('USDC')
    // Fee-filter mode surfaces the fee leg's currency, not the transfer's.
    expect(entryCurrency(feeInSher)).toBe('USDC')
    expect(entryCurrency(feeInSher, true)).toBe('SHER')
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
    token: 'usdc'
  }

  it('groups fee-bearing entries by their fee leg currency', () => {
    // feeInSher's fee leg is SHER; the standalone fee is USDC.
    const view = presentLedger([standaloneFee, feeInSher], FEE_FILTER, null, null, ['SHER'])
    expect(view.entryCount).toBe(1)
    expect(view.rows[0].currency).toBe('SHER')
  })
})
