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

function ledgerSheet(acc: CncAccounting): SheetRows {
  const { rows } = presentLedger(acc.entries, 'All')
  return [
    ['General Ledger'],
    [],
    ['Date', 'Action', 'Transaction', 'Account', 'Debit', 'Credit'],
    ...rows.map((r) => [r.date, r.cat, r.label, r.account, usd(r.dr), usd(r.cr)])
  ]
}

/** The four exported tabs (everything except the Summary), in display order. */
export function buildAccountingSheets(acc: CncAccounting): AccountingSheet[] {
  return [
    { name: 'Income Statement', rows: incomeSheet(acc) },
    { name: 'Balance Sheet', rows: balanceSheet(acc) },
    { name: 'Trial Balance', rows: trialSheet(acc) },
    { name: 'General Ledger', rows: ledgerSheet(acc) }
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

export async function exportAccountingExcel(acc: CncAccounting): Promise<void> {
  const mod = await import('xlsx')
  // Vite's CJS→ESM interop may expose SheetJS under `default`; fall back to the namespace.
  const XLSX = (mod as unknown as { default?: typeof import('xlsx') }).default ?? mod
  const workbook = XLSX.utils.book_new()
  for (const sheet of buildAccountingSheets(acc)) {
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
