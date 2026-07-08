import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Address } from 'viem'
import {
  buildAccountingTables,
  buildTables,
  exportAccountingPdf,
  exportTablesPdf
} from '../accountingPdf'
import { periodLabel } from '@/utils/accounting/presenter'
import { assembleCncAccounting, type CncAccounting } from '@/utils/accounting/assemble'
import { USDC_ADDRESS } from '@/constant'

const BANK = '0x1111111111111111111111111111111111111111'
const CLIENT = '0x7777777777777777777777777777777777777777'

/** A tiny live book: one $100 client deposit into the Bank → Service Revenue 100. */
function sampleBooks(): CncAccounting {
  return assembleCncAccounting({
    contracts: [{ type: 'Bank', address: BANK as Address, deployer: BANK as Address, admins: [] }],
    bankEvents: {
      bankDeposits: { items: [] },
      bankTokenDeposits: {
        items: [
          {
            id: 'bd1',
            contractAddress: BANK,
            depositor: CLIENT,
            token: USDC_ADDRESS,
            amount: '100000000',
            timestamp: 100
          }
        ]
      },
      bankTransfers: { items: [] },
      bankTokenTransfers: { items: [] },
      bankDividendDistributionTriggereds: { items: [] },
      bankFeePaids: { items: [] },
      bankOwnershipTransferreds: { items: [] },
      rawContractTokenTransfers: { items: [] }
    }
  })
}

describe('buildAccountingTables', () => {
  const tables = buildAccountingTables(sampleBooks())
  const byTitle = (title: string) => tables.find((t) => t.title === title)!

  it('produces one table per tab except the Summary', () => {
    expect(tables.map((t) => t.title)).toEqual([
      'Income Statement',
      'Balance Sheet',
      'Trial Balance',
      'General Ledger'
    ])
  })

  it('keeps formatted currency strings for display', () => {
    const income = byTitle('Income Statement').body
    const revenueRow = income.find((r) => r[0] === 'Total revenue')!
    expect(revenueRow[1]).toBe('$100.00')
  })

  it('right-aligns the amount columns', () => {
    expect(byTitle('Income Statement').align).toEqual(['left', 'right'])
    expect(byTitle('General Ledger').align).toEqual([
      'left',
      'left',
      'left',
      'left',
      'left',
      'right',
      'right'
    ])
  })

  it('trial balance total row carries equal debit and credit', () => {
    const total = byTitle('Trial Balance').body.find((r) => r[0] === 'Total')!
    expect(total[2]).toBe(total[3])
  })

  it('general ledger has a column header, one row per journal line, and a total', () => {
    const ledger = byTitle('General Ledger')
    expect(ledger.head).toEqual([
      'Date',
      'Action',
      'Transaction',
      'Activity',
      'Account',
      'Debit',
      'Credit'
    ])
    // the deposit posts two legs (debit Bank / credit Service Revenue) + a total row
    expect(ledger.body.length).toBe(3)
    const totalRow = ledger.body.at(-1)!
    expect(totalRow[2]).toBe('Total movements')
    expect(totalRow[5]).toBe('$100.00') // Debit total
    expect(totalRow[6]).toBe('$100.00') // Credit total
  })

  it('renders the Activity column via the supplied name resolver', () => {
    const named = buildAccountingTables(sampleBooks(), () => 'Acme Client')
    const ledger = named.find((t) => t.title === 'General Ledger')!
    // the deposit is an `actor` activity: "<name> paid $100.00 for services"
    const activity = String(ledger.body[0][3])
    expect(activity).toContain('Acme Client')
    expect(activity).toContain('for services')
  })
})

describe('buildTables (section selection)', () => {
  it('builds only the requested sections, in the given order', () => {
    const tables = buildTables(sampleBooks(), [{ key: 'ledger' }, { key: 'summary' }])
    expect(tables.map((t) => t.title)).toEqual(['General Ledger', 'Summary'])
  })

  it('exposes a Summary section (absent from the classic tabs)', () => {
    const [summary] = buildTables(sampleBooks(), [{ key: 'summary' }])
    expect(summary.title).toBe('Summary')
    // The live roll-up cards surface as metric rows.
    expect(summary.body.some((r) => r[0] === 'Net income')).toBe(true)
    expect(summary.body.some((r) => r[0] === 'Books balanced')).toBe(true)
  })

  it('restricts the ledger to the requested columns, in canonical order', () => {
    const [ledger] = buildTables(sampleBooks(), [
      { key: 'ledger', columns: ['cr', 'date', 'account'] }
    ])
    // Canonical order is Date, Account, Credit — not the toggle order.
    expect(ledger.head).toEqual(['Date', 'Account', 'Credit'])
    expect(ledger.align).toEqual(['left', 'left', 'right'])
    expect(ledger.body[0]).toHaveLength(3)
  })

  it('honours the active category filter and still totals the filtered rows', () => {
    const [ledger] = buildTables(sampleBooks(), [{ key: 'ledger', filter: 'Expense' }])
    // The deposit is Revenue, filtered out — only the (zero) total row remains.
    expect(ledger.body).toHaveLength(1)
    const totalRow = ledger.body[0]
    expect(totalRow[2]).toBe('Total movements')
    expect(totalRow[5]).toBe('$0.00')
  })

  it('names the category and period in the ledger heading when narrowed', () => {
    const [ledger] = buildTables(sampleBooks(), [
      { key: 'ledger', filter: 'Revenue', from: new Date('2026-01-01'), to: new Date('2026-02-01') }
    ])
    expect(ledger.title).toContain('General Ledger')
    expect(ledger.title).toContain('Revenue')
    expect(ledger.title).toContain('Jan 1, 2026')
  })

  it('keeps a plain "General Ledger" heading for the whole book', () => {
    const [ledger] = buildTables(sampleBooks(), [{ key: 'ledger' }])
    expect(ledger.title).toBe('General Ledger')
  })

  it('stamps the reporting period / "as of" date on the statement headings', () => {
    const [income] = buildTables(sampleBooks(), [
      { key: 'income', from: new Date('2026-01-01'), to: new Date('2026-02-01') }
    ])
    expect(income.title).toContain('Income Statement')
    expect(income.title).toContain('Jan 1, 2026')

    const [balance] = buildTables(sampleBooks(), [{ key: 'balance', asOf: new Date('2026-07-08') }])
    expect(balance.title).toBe('Balance Sheet — As of Jul 8, 2026')

    const [trial] = buildTables(sampleBooks(), [{ key: 'trial', asOf: new Date('2026-07-08') }])
    expect(trial.title).toBe('Trial Balance — As of Jul 8, 2026')
  })

  it('keeps plain statement headings for the whole book (no dates)', () => {
    const tables = buildTables(sampleBooks(), [
      { key: 'income' },
      { key: 'balance' },
      { key: 'trial' }
    ])
    expect(tables.map((t) => t.title)).toEqual([
      'Income Statement',
      'Balance Sheet',
      'Trial Balance'
    ])
  })
})

describe('periodLabel', () => {
  it('reads "All time" with no bounds', () => {
    expect(periodLabel(null, null)).toBe('All time')
  })

  it('formats a bounded range', () => {
    const label = periodLabel(new Date('2026-01-01'), new Date('2026-02-01'))
    expect(label).toContain('Jan 1, 2026')
    expect(label).toContain('Feb 1, 2026')
    expect(label).toContain('–')
  })
})

const saveMock = vi.fn()
const autoTableMock = vi.fn()
const addPageMock = vi.fn()

vi.mock('jspdf', () => {
  class FakeDoc {
    lastAutoTable = { finalY: 0 }
    internal = { pageSize: { getWidth: () => 842, getHeight: () => 595 } }
    GState = class {}
    save = saveMock
    addPage = addPageMock
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setGState() {}
    saveGraphicsState() {}
    restoreGraphicsState() {}
    text() {}
  }
  return { jsPDF: FakeDoc }
})

vi.mock('jspdf-autotable', () => ({ default: autoTableMock }))

describe('exportAccountingPdf', () => {
  afterEach(() => {
    saveMock.mockClear()
    autoTableMock.mockClear()
    addPageMock.mockClear()
  })

  it('renders one table per section and downloads the PDF', async () => {
    await exportAccountingPdf(sampleBooks())

    // Income Statement, Balance Sheet, Trial Balance, General Ledger.
    expect(autoTableMock).toHaveBeenCalledTimes(4)
    expect(saveMock).toHaveBeenCalledWith('cnc-accounting.pdf')
    // Flowing layout: no forced page breaks.
    expect(addPageMock).not.toHaveBeenCalled()

    // Sober header fill and zebra stripes are wired on every table.
    const opts = autoTableMock.mock.calls[0][1]
    expect(opts.headStyles.fillColor).toEqual([71, 85, 105])
    expect(opts.alternateRowStyles.fillColor).toEqual([241, 245, 249])
  })
})

describe('exportTablesPdf', () => {
  afterEach(() => {
    saveMock.mockClear()
    autoTableMock.mockClear()
    addPageMock.mockClear()
  })

  it('downloads under the given filename', async () => {
    const tables = buildTables(sampleBooks(), [{ key: 'income' }])
    await exportTablesPdf(tables, { filename: 'income-statement.pdf' })
    expect(saveMock).toHaveBeenCalledWith('income-statement.pdf')
  })

  it('starts each section on a fresh page when pageBreak is set', async () => {
    const tables = buildTables(sampleBooks(), [
      { key: 'summary' },
      { key: 'income' },
      { key: 'ledger' }
    ])
    await exportTablesPdf(tables, { filename: 'report.pdf', pageBreak: true })
    // One break before every section after the first.
    expect(addPageMock).toHaveBeenCalledTimes(2)
    expect(autoTableMock).toHaveBeenCalledTimes(3)
  })
})
