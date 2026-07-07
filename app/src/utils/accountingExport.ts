/**
 * Export the accounting books to a multi-sheet Excel workbook.
 *
 * One sheet per tab — Income Statement, Balance Sheet, Trial Balance, General Ledger —
 * i.e. every tab except the Summary. Sheet construction ({@link buildAccountingSheets})
 * is pure and unit-tested; it reads the live engine output ({@link CncAccounting})
 * through the same presenter the view uses. {@link exportAccountingExcel} lazy-loads
 * SheetJS and writes the file on click.
 */
import type { CncAccounting } from '@/utils/accounting/assemble'
import { presentIncome, presentBalance, presentTrial } from '@/utils/accounting/presenter'
import { presentLedger } from '@/utils/accounting/ledgerPresenter'
import { activityText } from '@/utils/accounting/describeEntry'

type Cell = string | number
type SheetRows = Cell[][]
/** Turns a party's address into a display name; defaults to a shortened address. */
export type ResolveName = (address: string) => string

export interface AccountingSheet {
  name: string
  rows: SheetRows
}

/** `"$1,234.50"` → `1234.5`; `"—"` / `""` → `""` (blank cell). */
function usd(value: string): number | '' {
  if (!value || value === '—') return ''
  const n = Number(value.replace(/[$,]/g, ''))
  return Number.isNaN(n) ? '' : n
}

function incomeSheet(acc: CncAccounting): SheetRows {
  const income = presentIncome(acc.entries)
  return [
    ['Income Statement'],
    [],
    ['Revenue'],
    ...income.revLines.map((r) => [r.label, usd(r.value)]),
    ['Total revenue', usd(income.totalRevenue)],
    [],
    ['Expenses'],
    ...income.expLines.map((e) => [e.label, usd(e.value)]),
    ['Total expenses', usd(income.totalExpenses)],
    [],
    ['Net income (profit)', usd(income.netIncome)]
  ]
}

function balanceSheet(acc: CncAccounting): SheetRows {
  const balance = presentBalance(acc.entries)
  return [
    ['Balance Sheet'],
    [],
    ['Assets'],
    ...balance.assetLines.map((a) => [a.label, usd(a.value)]),
    ['Total assets', usd(balance.totalAssets)],
    [],
    ['Liabilities'],
    ...balance.liabLines.map((l) => [l.label, usd(l.value)]),
    [],
    ['Equity'],
    ...balance.equityLines.map((q) => [q.label, usd(q.value)]),
    ['Total equity', usd(balance.totalEquity)],
    [],
    ['Liabilities + Equity', usd(balance.liabilitiesPlusEquity)]
  ]
}

function trialSheet(acc: CncAccounting): SheetRows {
  const trial = presentTrial(acc.generalLedger)
  return [
    ['Trial Balance'],
    [],
    ['Account', 'Nature', 'Debit', 'Credit'],
    ...trial.rows.map((t) => [t.account, t.nature, usd(t.dr), usd(t.cr)]),
    ['Total', '', usd(trial.total), usd(trial.total)]
  ]
}

function ledgerSheet(acc: CncAccounting, resolveName?: ResolveName): SheetRows {
  const { rows } = presentLedger(acc.entries, 'All')
  return [
    ['General Ledger'],
    [],
    ['Date', 'Action', 'Transaction', 'Activity', 'Account', 'Debit', 'Credit'],
    ...rows.map((r) => [
      r.date,
      r.cat,
      r.label,
      activityText(r.activity, resolveName),
      r.account,
      usd(r.dr),
      usd(r.cr)
    ])
  ]
}

/** The four exported tabs (everything except the Summary), in display order. */
export function buildAccountingSheets(
  acc: CncAccounting,
  resolveName?: ResolveName
): AccountingSheet[] {
  return [
    { name: 'Income Statement', rows: incomeSheet(acc) },
    { name: 'Balance Sheet', rows: balanceSheet(acc) },
    { name: 'Trial Balance', rows: trialSheet(acc) },
    { name: 'General Ledger', rows: ledgerSheet(acc, resolveName) }
  ]
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Sober palette, matching the PDF export: slate-600 header, slate-100 zebra stripe.
const HEADER_FILL = '475569'
const ZEBRA_FILL = 'F1F5F9'

/* eslint-disable @typescript-eslint/no-explicit-any -- SheetJS cell/worksheet objects are untyped */
type XlsxModule = typeof import('xlsx-js-style')

/**
 * Style a worksheet in place: a coloured, bold title row, zebra-striped data rows,
 * a slightly larger font and auto-sized columns. Blank spacer rows are left untouched
 * so they keep separating the sub-sections. Requires a style-aware SheetJS build.
 */
function styleSheet(ws: any, XLSX: XlsxModule): void {
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')

  const rowHasContent = (r: number): boolean => {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (cell && cell.v !== '' && cell.v != null) return true
    }
    return false
  }

  let stripe = false
  for (let r = range.s.r; r <= range.e.r; r++) {
    if (!rowHasContent(r)) continue
    const isTitle = r === range.s.r
    if (!isTitle) stripe = !stripe

    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c })
      if (!ws[addr]) ws[addr] = { t: 's', v: '' }
      const style: any = { font: { sz: 12, bold: isTitle } }
      if (isTitle) {
        style.fill = { patternType: 'solid', fgColor: { rgb: HEADER_FILL } }
        style.font.color = { rgb: 'FFFFFF' }
      } else if (stripe) {
        style.fill = { patternType: 'solid', fgColor: { rgb: ZEBRA_FILL } }
      }
      ws[addr].s = style
    }
  }

  // Auto-size columns to their widest cell (capped) for readability.
  const cols: { wch: number }[] = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    let width = 10
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      const len = cell && cell.v != null ? String(cell.v).length : 0
      if (len + 2 > width) width = len + 2
    }
    cols.push({ wch: Math.min(width, 60) })
  }
  ws['!cols'] = cols
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function exportAccountingExcel(
  acc: CncAccounting,
  resolveName?: ResolveName
): Promise<void> {
  // `xlsx-js-style` is a drop-in SheetJS fork that also writes cell styles
  // (the community `xlsx` build silently drops them), so the zebra survives export.
  const mod = await import('xlsx-js-style')
  // Vite's CJS→ESM interop may expose SheetJS under `default`; fall back to the namespace.
  const XLSX = (mod as unknown as { default?: XlsxModule }).default ?? mod
  const workbook = XLSX.utils.book_new()
  for (const sheet of buildAccountingSheets(acc, resolveName)) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows)
    styleSheet(ws, XLSX)
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name)
  }
  // Build the file in-memory and download via a Blob — `XLSX.writeFile` relies on
  // environment sniffing (Node fs) that breaks in the browser bundle.
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  downloadBlob(blob, 'cnc-accounting.xlsx')
}
