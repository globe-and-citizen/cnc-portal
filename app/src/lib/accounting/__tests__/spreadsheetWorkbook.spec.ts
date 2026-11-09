import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildSheets, exportSheetsExcel } from '../spreadsheet'

describe('exportSheetsExcel', () => {
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

    const sheets = buildSheets({ journal: [] }, [
      { key: 'income' },
      { key: 'balance' },
      { key: 'trial' },
      { key: 'ledger' }
    ])
    await exportSheetsExcel(sheets, 'cnc-accounting.xlsx')

    expect(captured).not.toBeNull()
    expect(captured!.type).toContain('spreadsheetml')
    // First bytes of a .xlsx are the ZIP signature "PK".
    const bytes = new Uint8Array(captured!.parts[0] as ArrayBuffer)
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b])
    const XLSX = await import('xlsx-js-style')
    const workbook = XLSX.read(bytes, { type: 'array' })
    const income = workbook.Sheets['Income Statement']!
    const row = XLSX.utils
      .sheet_to_json<(string | number)[]>(income, { header: 1 })
      .find((r) => r[0] === 'Total revenue')!
    expect(row[1]).toBe(0)
    expect(
      Object.values(income).some(
        (cell) => typeof cell === 'object' && cell?.t === 'n' && cell.v === 0
      )
    ).toBe(true)
  })
})
