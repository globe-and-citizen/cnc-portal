/**
 * Export the accounting books to a multi-sheet Excel workbook.
 *
 * One sheet per tab — Income Statement, Balance Sheet, Trial Balance, General Ledger —
 * i.e. every tab except the Summary. Sheet construction ({@link buildAccountingSheets})
 * is pure and unit-tested; {@link exportAccountingExcel} lazy-loads SheetJS and writes
 * the file on click.
 */
import {
  revLines,
  expLines,
  totalRevenue,
  totalExpenses,
  netIncome,
  assetLines,
  liabLines,
  equityLines,
  totalAssets,
  totalEquity,
  trialRows,
  trialTotal,
  buildLedger,
  dateMin,
  dateMax
} from './accountingDemo'

type Cell = string | number
type SheetRows = Cell[][]

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

function incomeSheet(): SheetRows {
  return [
    ['Income Statement'],
    [],
    ['Revenue'],
    ...revLines.map((r) => [r.label, usd(r.value)]),
    ['Total revenue', usd(totalRevenue)],
    [],
    ['Expenses'],
    ...expLines.map((e) => [e.label, usd(e.value)]),
    ['Total expenses', usd(totalExpenses)],
    [],
    ['Net income (profit)', usd(netIncome)]
  ]
}

function balanceSheet(): SheetRows {
  return [
    ['Balance Sheet'],
    [],
    ['Assets'],
    ...assetLines.map((a) => [a.label, usd(a.value)]),
    ['Total assets', usd(totalAssets)],
    [],
    ['Liabilities'],
    ...liabLines.map((l) => [l.label, usd(l.value)]),
    [],
    ['Equity'],
    ...equityLines.map((q) => [q.label, usd(q.value)]),
    ['Total equity', usd(totalEquity)],
    [],
    ['Liabilities + Equity', usd(totalAssets)]
  ]
}

function trialSheet(): SheetRows {
  return [
    ['Trial Balance'],
    [],
    ['Account', 'Nature', 'Debit', 'Credit'],
    ...trialRows.map((t) => [t.account, t.nature, usd(t.dr), usd(t.cr)]),
    ['Total', '', usd(trialTotal), usd(trialTotal)]
  ]
}

function ledgerSheet(): SheetRows {
  const { rows } = buildLedger('All', dateMin, dateMax)
  return [
    ['General Ledger'],
    [],
    ['Date', 'Action', 'Transaction', 'Account', 'Debit', 'Credit'],
    ...rows.map((r) => [r.date, r.cat, r.label, r.account, usd(r.dr), usd(r.cr)])
  ]
}

/** The four exported tabs (everything except the Summary), in display order. */
export function buildAccountingSheets(): AccountingSheet[] {
  return [
    { name: 'Income Statement', rows: incomeSheet() },
    { name: 'Balance Sheet', rows: balanceSheet() },
    { name: 'Trial Balance', rows: trialSheet() },
    { name: 'General Ledger', rows: ledgerSheet() }
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

export async function exportAccountingExcel(): Promise<void> {
  const mod = await import('xlsx')
  // Vite's CJS→ESM interop may expose SheetJS under `default`; fall back to the namespace.
  const XLSX = (mod as unknown as { default?: typeof import('xlsx') }).default ?? mod
  const workbook = XLSX.utils.book_new()
  for (const sheet of buildAccountingSheets()) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(sheet.rows), sheet.name)
  }
  // Build the file in-memory and download via a Blob — `XLSX.writeFile` relies on
  // environment sniffing (Node fs) that breaks in the browser bundle.
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  downloadBlob(blob, 'cnc-accounting.xlsx')
}
