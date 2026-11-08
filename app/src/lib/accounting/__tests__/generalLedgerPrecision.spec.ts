import { describe, expect, it } from 'vitest'
import { generalLedgerPdfTable } from '../generalLedgerPdfTable'
import { generalLedgerSheetRows } from '../generalLedgerSheet'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'
import { journalLedgerRows } from '@/utils/accounting/journalLedgerPresenter'

describe('General Ledger export precision', () => {
  it('prints the same rounded table quantity in PDF and Excel', () => {
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
      '0.000382',
      '$2,698.41899'
    ])
    expect(generalLedgerSheetRows({ journal }, undefined, { columns })[3]).toEqual([
      0.000382, 2698.41899
    ])
  })

  it('preserves the screen threshold and reports missing valuation explicitly', () => {
    const journal = finalizeJournal([
      {
        id: 'tiny',
        timestamp: 100,
        useCase: 'CASH-IN',
        debit: 'Cash — Bank',
        credit: 'Service Revenue',
        token: 'native',
        rawAmount: '1',
        rate: 0,
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      }
    ])
    const rows = generalLedgerSheetRows({ journal }, undefined, { columns: ['quantity', 'rate'] })
    expect(rows[3]).toEqual(['<0.000001', 'Unavailable'])
  })
})
