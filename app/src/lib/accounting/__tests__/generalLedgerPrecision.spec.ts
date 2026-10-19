import { describe, expect, it } from 'vitest'
import { generalLedgerPdfTable } from '../generalLedgerPdfTable'
import { generalLedgerSheetRows } from '../generalLedgerSheet'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'

describe('General Ledger export precision', () => {
  it('exports the original quantity rather than the compact table label', () => {
    const journal = finalizeJournal([
      {
        id: 'fractional-native',
        timestamp: 100,
        useCase: 'CASH-IN',
        debit: 'Cash — Bank',
        credit: 'Service Revenue',
        token: 'native',
        rawAmount: '381862376267664',
        rate: 2698.41899,
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      }
    ])
    const options = { columns: ['quantity', 'rate'] as const }
    const columns = [...options.columns]

    expect(journalLedgerRows(journal)[0]!.quantityDisplay).toBe('0.000382')
    expect(generalLedgerPdfTable({ journal }, undefined, { columns }).body[0]).toEqual([
      '0.000381862376267664',
      '$2,698.41899'
    ])
    expect(generalLedgerSheetRows({ journal }, undefined, { columns })[3]).toEqual([
      0.000381862376267664, 2698.41899
    ])
  })
})
