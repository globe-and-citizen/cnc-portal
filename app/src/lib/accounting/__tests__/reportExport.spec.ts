import { afterEach, describe, expect, it, vi } from 'vitest'
import { sampleBooks } from '@/utils/accounting/__tests__/fixtures'
import { buildTables, exportTablesPdf } from '../pdf'
import { buildSheets } from '../spreadsheet'

const autoTableMock = vi.hoisted(() => vi.fn())

vi.mock('jspdf', () => {
  class FakeDoc {
    internal = { pageSize: { getWidth: () => 842, getHeight: () => 595 } }
    GState = class {}
    save() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setGState() {}
    saveGraphicsState() {}
    restoreGraphicsState() {}
    text() {}
    getTextWidth() {
      return 0
    }
  }
  return { jsPDF: FakeDoc }
})

vi.mock('jspdf-autotable', () => ({ default: autoTableMock }))

const SECTION_TITLES = ['Assets', 'Liabilities', 'Equity']
const COLUMNS = ['Account', 'Nature', 'Balance']
const EARNINGS_COLUMNS = ['Account', 'Nature', 'Contribution']
const EARNINGS_TITLE = 'Earnings to date calculation'

const books = { journal: sampleBooks().journal }

describe('[AC-US-ACCT-004-06] Balance Sheet export follows the screen structure', () => {
  afterEach(() => autoTableMock.mockClear())

  describe('PDF', () => {
    const [balance] = buildTables(books, [{ key: 'balance' }])
    const body = balance!.body
    const indexOf = (label: string) => body.findIndex((cells) => cells[0] === label)

    it('prints every section with its own column headers', () => {
      for (const title of SECTION_TITLES) expect(body[indexOf(title) + 1]).toEqual(COLUMNS)
      expect(body[indexOf(EARNINGS_TITLE) + 1]).toEqual(EARNINGS_COLUMNS)
    })

    it('gives each account row its nature and balance', () => {
      expect(body).toContainEqual(['Cash — Bank', 'Asset', '$100.00'])
    })

    it('closes with Liabilities + Equity', () => {
      expect(body.at(-1)![0]).toBe('Liabilities + Equity')
    })

    it('renders without a table header, in bold on section rows only', async () => {
      await exportTablesPdf([balance!], { filename: 'balance.pdf' })
      const { head, didParseCell } = autoTableMock.mock.calls[0]![1]
      const styleOfRow = (index: number) => {
        const cell = { styles: {} }
        didParseCell({ section: 'body', row: { index }, cell })
        return cell.styles
      }

      expect(head).toEqual([])
      expect(styleOfRow(indexOf('Assets'))).toMatchObject({ fontStyle: 'bold' })
      expect(styleOfRow(indexOf('Cash — Bank'))).not.toHaveProperty('fontStyle')
    })
  })

  describe('Excel', () => {
    const [balance] = buildSheets(books, [{ key: 'balance' }])
    const rows = balance!.rows
    const indexOf = (label: string) => rows.findIndex((cells) => cells[0] === label)

    it('prints every section with its own column headers', () => {
      for (const title of SECTION_TITLES) expect(rows[indexOf(title) + 1]).toEqual(COLUMNS)
      expect(rows[indexOf(EARNINGS_TITLE) + 1]).toEqual(EARNINGS_COLUMNS)
    })

    it('gives each account row its nature and a numeric balance', () => {
      expect(rows).toContainEqual(['Cash — Bank', 'Asset', 100])
    })

    it('emphasizes section titles and totals, not account lines', () => {
      expect(balance!.emphasizedRows).toContain(indexOf('Assets'))
      expect(balance!.emphasizedRows).toContain(indexOf('Total assets'))
      expect(balance!.emphasizedRows).not.toContain(indexOf('Cash — Bank'))
    })
  })
})

describe('[AC-US-ACCT-004-11] report sections over a selected period', () => {
  const scope = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 31) }
  const periodLabel = 'Jan 1, 2026 – Jan 31, 2026'
  const sheetHeaderRows = 3
  const assignedBooks = {
    journal: books.journal.map((entry) => ({ ...entry, accountAssignment: { editable: true } }))
  }

  it('names the period on the PDF Summary and Account Assignments', () => {
    const [summary, assignments] = buildTables(books, [
      { key: 'summary', ...scope },
      { key: 'assignments', ...scope }
    ])

    expect(summary!.title).toBe(`Summary — ${periodLabel}`)
    expect(assignments!.title).toBe(`Account Assignments — ${periodLabel}`)
  })

  it('names the period on the Excel Summary and Account Assignments', () => {
    const [summary, assignments] = buildSheets(books, [
      { key: 'summary', ...scope },
      { key: 'assignments', ...scope }
    ])

    expect(summary!.rows[0]).toEqual([`Summary — ${periodLabel}`])
    expect(assignments!.rows[0]).toEqual([`Account Assignments — ${periodLabel}`])
  })

  it('drops PDF assignment rows outside the period', () => {
    const [wholeBook] = buildTables(assignedBooks, [{ key: 'assignments' }])
    const [scoped] = buildTables(assignedBooks, [{ key: 'assignments', ...scope }])

    expect(wholeBook!.body.length).toBeGreaterThan(0)
    expect(scoped!.body).toEqual([])
  })

  it('drops Excel assignment rows outside the period', () => {
    const [wholeBook] = buildSheets(assignedBooks, [{ key: 'assignments' }])
    const [scoped] = buildSheets(assignedBooks, [{ key: 'assignments', ...scope }])

    expect(wholeBook!.rows.length).toBeGreaterThan(sheetHeaderRows)
    expect(scoped!.rows).toHaveLength(sheetHeaderRows)
  })
})
