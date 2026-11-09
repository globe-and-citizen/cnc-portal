import { describe, expect, it } from 'vitest'
import { buildSheets } from '../spreadsheet'
import { finalizeJournal } from '@/utils/accounting/__tests__/assembleAccounting'

describe('fractional report projections', () => {
  it('rounds the same journal amount in every report without changing the selected period', () => {
    const journal = finalizeJournal([
      {
        id: 'fractional',
        timestamp: 100,
        useCase: 'CASH-IN',
        debit: 'Cash — Bank',
        credit: 'Service Revenue',
        token: 'usdc',
        rawAmount: '1005000',
        rate: 1,
        internal: false,
        memo: '',
        enrichment: 'not-applicable'
      }
    ])
    const sheets = buildSheets({ journal }, [
      { key: 'summary' },
      { key: 'income' },
      { key: 'balance' },
      { key: 'trial' },
      { key: 'ledger' },
      { key: 'income', from: new Date(200000) }
    ])
    expect(sheets[0]!.rows.find((row) => row[0] === 'Net income')![1]).toBe(1.01)
    expect(sheets[1]!.rows.find((row) => row[0] === 'Total revenue')![1]).toBe(1.01)
    expect(sheets[2]!.rows.find((row) => row[0] === 'Total assets')![2]).toBe(1.01)
    expect(sheets[3]!.rows.find((row) => row[0] === 'Total')!.slice(2)).toEqual([1.01, 1.01])
    expect(sheets[4]!.rows.at(-1)![9]).toBe(1.01)
    expect(sheets[5]!.rows.find((row) => row[0] === 'Total revenue')![1]).toBe(0)
  })
})

describe('account totals', () => {
  it('does not invent a drill-down footer when its numeric source is missing', () => {
    const [ledger] = buildSheets({ journal: [] }, [
      { key: 'ledger', journalAccountLabel: 'Selected account' }
    ])
    expect(ledger.rows.at(-1)![9]).toBe('Unavailable')
    expect(ledger.rows.at(-1)![10]).toBe('Unavailable')
  })
})
