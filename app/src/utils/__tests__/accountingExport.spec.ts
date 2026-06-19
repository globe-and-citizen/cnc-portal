import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildAccountingSheets, exportAccountingExcel } from '../accountingExport'

describe('buildAccountingSheets', () => {
  const sheets = buildAccountingSheets()
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
    const netIncomeRow = income.find((r) => r[0] === 'Net income (profit)')!
    expect(netIncomeRow[1]).toBe(4.2)

    const balance = byName('Balance Sheet').rows
    const totalAssetsRow = balance.find((r) => r[0] === 'Total assets')!
    expect(totalAssetsRow[1]).toBe(142.2)
  })

  it('trial balance totals debit = credit = 253', () => {
    const total = byName('Trial Balance').rows.find((r) => r[0] === 'Total')!
    expect(total[2]).toBe(253)
    expect(total[3]).toBe(253)
  })

  it('general ledger lists every journal line of the full book', () => {
    const rows = byName('General Ledger').rows
    // title + blank + header + one row per journal line (well over 18 entries)
    expect(rows[2]).toEqual(['Date', 'Action', 'Transaction', 'Account', 'Debit', 'Credit'])
    expect(rows.length).toBeGreaterThan(20)
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

    await exportAccountingExcel()

    expect(captured).not.toBeNull()
    expect(captured!.type).toContain('spreadsheetml')
    // First bytes of a .xlsx are the ZIP signature "PK".
    const bytes = new Uint8Array(captured!.parts[0] as ArrayBuffer)
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
  })
})
