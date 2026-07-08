import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Address } from 'viem'
import { buildAccountingSheets, buildSheets, exportAccountingExcel } from '../accountingExport'
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

describe('buildAccountingSheets', () => {
  const sheets = buildAccountingSheets(sampleBooks())
  const byName = (name: string) => sheets.find((s) => s.name === name)!

  it('produces one sheet per tab except the Summary', () => {
    expect(sheets.map((s) => s.name)).toEqual([
      'Income Statement',
      'Balance Sheet',
      'Trial Balance',
      'General Ledger'
    ])
  })

  it('writes numeric cells (not formatted strings) so Excel can compute', () => {
    const income = byName('Income Statement').rows
    const revenueRow = income.find((r) => r[0] === 'Total revenue')!
    expect(revenueRow[1]).toBe(100)

    const balance = byName('Balance Sheet').rows
    const totalAssetsRow = balance.find((r) => r[0] === 'Total assets')!
    expect(totalAssetsRow[1]).toBe(100)
  })

  it('trial balance totals debit = credit', () => {
    const total = byName('Trial Balance').rows.find((r) => r[0] === 'Total')!
    expect(total[2]).toBe(total[3])
  })

  it('general ledger has a header row, one row per journal line, and a total', () => {
    const rows = byName('General Ledger').rows
    expect(rows[2]).toEqual([
      'Date',
      'Action',
      'Transaction',
      'Activity',
      'Account',
      'Debit',
      'Credit'
    ])
    // title + blank + header + the deposit's two legs + total row
    expect(rows.length).toBe(6)
    const totalRow = rows.at(-1)!
    expect(totalRow[2]).toBe('Total movements')
    expect(totalRow[5]).toBe(100) // numeric Debit total
  })

  it('fills the Activity column via the supplied name resolver', () => {
    const rows = buildAccountingSheets(sampleBooks(), () => 'Acme Client').find(
      (s) => s.name === 'General Ledger'
    )!.rows
    // header + first journal line; Activity is the 4th column (index 3)
    expect(String(rows[3][3])).toContain('Acme Client')
  })
})

describe('buildSheets (section selection)', () => {
  it('builds only the requested sheets, in the given order', () => {
    const sheets = buildSheets(sampleBooks(), [{ key: 'summary' }, { key: 'ledger' }])
    expect(sheets.map((s) => s.name)).toEqual(['Summary', 'General Ledger'])
  })

  it('exposes a Summary sheet with numeric metric cells', () => {
    const [summary] = buildSheets(sampleBooks(), [{ key: 'summary' }])
    const netIncome = summary.rows.find((r) => r[0] === 'Net income')!
    expect(typeof netIncome[1]).toBe('number')
  })

  it('restricts the ledger sheet to the requested columns, in canonical order', () => {
    const [ledger] = buildSheets(sampleBooks(), [{ key: 'ledger', columns: ['cr', 'date'] }])
    // rows: title, blank, header, then data — canonical order Date, Credit.
    expect(ledger.rows[2]).toEqual(['Date', 'Credit'])
    expect(ledger.rows[3]).toHaveLength(2)
  })

  it('honours the active category filter and still appends a total row', () => {
    const [ledger] = buildSheets(sampleBooks(), [{ key: 'ledger', filter: 'Expense' }])
    // title + blank + header + total — the deposit is Revenue, filtered out.
    expect(ledger.rows).toHaveLength(4)
    expect(ledger.rows.at(-1)![2]).toBe('Total movements')
  })

  it('names the category in the ledger title row but keeps a short tab name', () => {
    const [ledger] = buildSheets(sampleBooks(), [{ key: 'ledger', filter: 'Revenue' }])
    expect(String(ledger.rows[0][0])).toBe('General Ledger — Revenue')
    expect(ledger.name).toBe('General Ledger')
  })
})

describe('exportAccountingExcel', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('builds and downloads a valid .xlsx blob (end to end, real SheetJS)', async () => {
    let captured: { parts: BlobPart[]; type: string } | null = null
    const RealBlob = globalThis.Blob
    class CapturingBlob extends RealBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options)
        captured = { parts: parts ?? [], type: options?.type ?? '' }
      }
    }
    vi.stubGlobal('Blob', CapturingBlob)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportAccountingExcel(sampleBooks())

    expect(captured).not.toBeNull()
    expect(captured!.type).toContain('spreadsheetml')
    // First bytes of a .xlsx are the ZIP signature "PK".
    const bytes = new Uint8Array(captured!.parts[0] as ArrayBuffer)
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})
