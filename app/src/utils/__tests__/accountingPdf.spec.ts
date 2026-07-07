import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Address } from 'viem'
import { buildAccountingTables, exportAccountingPdf } from '../accountingPdf'
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

  it('general ledger has a column header and one row per journal line', () => {
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
    // the deposit posts two legs (debit Bank / credit Service Revenue)
    expect(ledger.body.length).toBe(2)
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

const saveMock = vi.fn()
const autoTableMock = vi.fn()

vi.mock('jspdf', () => {
  class FakeDoc {
    lastAutoTable = { finalY: 0 }
    internal = { pageSize: { getWidth: () => 842, getHeight: () => 595 } }
    GState = class {}
    save = saveMock
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
  })

  it('renders one table per section and downloads the PDF', async () => {
    await exportAccountingPdf(sampleBooks())

    // Income Statement, Balance Sheet, Trial Balance, General Ledger.
    expect(autoTableMock).toHaveBeenCalledTimes(4)
    expect(saveMock).toHaveBeenCalledWith('cnc-accounting.pdf')

    // Sober header fill and zebra stripes are wired on every table.
    const opts = autoTableMock.mock.calls[0][1]
    expect(opts.headStyles.fillColor).toEqual([71, 85, 105])
    expect(opts.alternateRowStyles.fillColor).toEqual([241, 245, 249])
  })
})
