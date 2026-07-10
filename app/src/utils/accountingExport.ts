/**
 * Export the accounting books to an Excel workbook.
 *
 * Section sheets — Summary, Income Statement, Balance Sheet, Trial Balance,
 * General Ledger — are built by pure, unit-tested functions that read the live
 * engine output ({@link CncAccounting}) through the same presenters the view
 * uses. {@link buildAccountingSheets} yields the classic four exported tabs
 * (everything except the Summary); {@link buildSheets} builds an arbitrary
 * selection. {@link exportSheetsExcel} lazy-loads SheetJS and writes the file.
 */
import type { CncAccounting } from '@/utils/accounting/assemble'
import {
  presentIncome,
  presentBalance,
  presentTrial,
  presentSummaryCards,
  presentBanner,
  filterByPeriod,
  incomeExportTitle,
  balanceExportTitle,
  trialExportTitle
} from '@/utils/accounting/presenter'
import { buildGeneralLedger } from '@/utils/accounting/generalLedger'
import {
  presentLedger,
  ledgerExportTitle,
  resolveLedgerColumns,
  ledgerTotalRow,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerPresenter'
import { activityText } from '@/utils/accounting/describeEntry'
import type { LedgerRow } from '@/utils/accounting/ledgerPresenter'
import type { SectionKey, SectionSpec } from '@/utils/accounting/exportSpec'

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

function summarySheet(acc: CncAccounting): SheetRows {
  const cards = presentSummaryCards(acc.summary, acc.incomeStatement, acc.balanceSheet)
  const banner = presentBanner(acc.balanceSheet, acc.generalLedger)
  return [
    ['Summary'],
    [],
    ...cards.map((c) => [c.label, usd(c.value)]),
    [],
    ['Books balanced', banner.balanced ? 'Yes' : 'No'],
    ['Accounting identity', banner.identity],
    ['Trial balance', banner.trial]
  ]
}

function incomeSheet(acc: CncAccounting, from?: Date | null, to?: Date | null): SheetRows {
  const income = presentIncome(acc.entries, from, to)
  return [
    [incomeExportTitle(from, to)],
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

function balanceSheetRows(acc: CncAccounting, asOf?: Date | null): SheetRows {
  const balance = presentBalance(acc.entries, asOf)
  return [
    [balanceExportTitle(asOf)],
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

function trialSheet(acc: CncAccounting, asOf?: Date | null): SheetRows {
  const ledger = asOf
    ? buildGeneralLedger(filterByPeriod(acc.entries, null, asOf))
    : acc.generalLedger
  const trial = presentTrial(ledger)
  return [
    [trialExportTitle(asOf)],
    [],
    ['Account', 'Nature', 'Debit', 'Credit'],
    ...trial.rows.map((t) => [t.account, t.nature, usd(t.dr), usd(t.cr)]),
    ['Total', '', usd(trial.total), usd(trial.total)]
  ]
}

/** How each ledger column renders in the export: header + cell value. */
const LEDGER_SHEET_CELL: Record<
  LedgerColumnKey,
  (r: LedgerRow, resolveName?: ResolveName) => Cell
> = {
  date: (r) => r.date,
  action: (r) => r.cat,
  transaction: (r) => r.label,
  activity: (r, resolveName) => activityText(r.activity, resolveName),
  account: (r) => r.account,
  dr: (r) => usd(r.dr),
  cr: (r) => usd(r.cr),
  currency: (r) => r.currency,
  quantity: (r) => r.quantity,
  rate: (r) => r.rate
}

interface LedgerSheetOptions {
  filter?: string
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
}

function ledgerSheet(
  acc: CncAccounting,
  resolveName?: ResolveName,
  opts: LedgerSheetOptions = {}
): SheetRows {
  const { rows, total } = presentLedger(acc.entries, opts.filter ?? 'All', opts.from, opts.to)
  const cols = resolveLedgerColumns(opts.columns)
  return [
    // Title row spells out the active category / period; the tab keeps its short name.
    [ledgerExportTitle(opts.filter, opts.from, opts.to)],
    [],
    cols.map((c) => c.label),
    ...rows.map((r) => cols.map((c) => LEDGER_SHEET_CELL[c.value](r, resolveName))),
    // Carry the movement total the table footer shows, so a filtered export totals its rows.
    // Excel needs a numeric total cell, so render it through `usd` like the row amounts.
    ledgerTotalRow(cols, usd(total))
  ]
}

/** The sheet name shown on a tab, per section. */
const SHEET_NAME: Record<SectionKey, string> = {
  summary: 'Summary',
  income: 'Income Statement',
  balance: 'Balance Sheet',
  trial: 'Trial Balance',
  ledger: 'General Ledger'
}

/** Build a single section's sheet from its spec. */
function sectionSheet(
  acc: CncAccounting,
  spec: SectionSpec,
  resolveName?: ResolveName
): AccountingSheet {
  const rows = (() => {
    switch (spec.key) {
      case 'summary':
        return summarySheet(acc)
      case 'income':
        return incomeSheet(acc, spec.from, spec.to)
      case 'balance':
        return balanceSheetRows(acc, spec.asOf)
      case 'trial':
        return trialSheet(acc, spec.asOf)
      case 'ledger':
        return ledgerSheet(acc, resolveName, {
          filter: spec.filter,
          from: spec.from,
          to: spec.to,
          columns: spec.columns
        })
    }
  })()
  return { name: SHEET_NAME[spec.key], rows }
}

/** Build sheets for an arbitrary section selection, in the order given. */
export function buildSheets(
  acc: CncAccounting,
  specs: readonly SectionSpec[],
  resolveName?: ResolveName
): AccountingSheet[] {
  return specs.map((spec) => sectionSheet(acc, spec, resolveName))
}

/** The four exported tabs (everything except the Summary), in display order. */
export function buildAccountingSheets(
  acc: CncAccounting,
  resolveName?: ResolveName
): AccountingSheet[] {
  return [
    { name: 'Income Statement', rows: incomeSheet(acc) },
    { name: 'Balance Sheet', rows: balanceSheetRows(acc) },
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

/** Write the given section sheets to an Excel workbook and download it. */
export async function exportSheetsExcel(
  sheets: AccountingSheet[],
  filename: string
): Promise<void> {
  // `xlsx-js-style` is a drop-in SheetJS fork that also writes cell styles
  // (the community `xlsx` build silently drops them), so the zebra survives export.
  const mod = await import('xlsx-js-style')
  // Vite's CJS→ESM interop may expose SheetJS under `default`; fall back to the namespace.
  const XLSX = (mod as unknown as { default?: XlsxModule }).default ?? mod
  const workbook = XLSX.utils.book_new()
  for (const sheet of sheets) {
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
  downloadBlob(blob, filename)
}

export async function exportAccountingExcel(
  acc: CncAccounting,
  resolveName?: ResolveName
): Promise<void> {
  await exportSheetsExcel(buildAccountingSheets(acc, resolveName), 'cnc-accounting.xlsx')
}
