/**
 * Print the accounting books to a downloadable PDF.
 *
 * Section tables — Summary, Income Statement, Balance Sheet, Trial Balance,
 * General Ledger — are built by pure, unit-tested functions that read the live
 * engine output ({@link CncAccounting}) through the same presenters the view and
 * the Excel export use. {@link buildAccountingTables} yields the classic four
 * printed tabs (everything except the Summary); {@link buildTables} builds an
 * arbitrary selection (used by the Summary "Export report" modal and the
 * per-page exports). {@link exportTablesPdf} lazy-loads jsPDF + autotable,
 * renders each table with a sober header colour and zebra-striped rows, stamps a
 * diagonal "CNC Portal" watermark on every page, and downloads the file.
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
import { presentAccountLedger, accountLedgerTitle } from '@/utils/accounting/accountLedger'
import { activityText } from '@/utils/accounting/describeEntry'
import type { LedgerRow } from '@/utils/accounting/ledgerPresenter'
import type { SectionSpec } from '@/utils/accounting/exportSpec'

type Cell = string | number
type Align = 'left' | 'right'
/** Turns a party's address into a display name; defaults to a shortened address. */
export type ResolveName = (address: string) => string

export interface AccountingPdfTable {
  /** Section heading printed above the table. */
  title: string
  /** Column headers. */
  head: string[]
  /** Body rows, one array of cells per row. */
  body: Cell[][]
  /** Horizontal alignment per column (defaults to left). */
  align: Align[]
}

/** A blank spacer row, used to separate sub-sections inside a statement. */
const GAP: Cell[] = ['', '']

function summaryTable(acc: CncAccounting): AccountingPdfTable {
  const cards = presentSummaryCards(acc.summary, acc.incomeStatement, acc.balanceSheet)
  const banner = presentBanner(acc.balanceSheet, acc.generalLedger)
  return {
    title: 'Summary',
    head: ['Metric', 'Value'],
    align: ['left', 'right'],
    body: [
      ...cards.map((c) => [c.label, c.value]),
      GAP,
      ['Books balanced', banner.balanced ? 'Yes' : 'No'],
      ['Accounting identity', banner.identity],
      ['Trial balance', banner.trial]
    ]
  }
}

function incomeTable(acc: CncAccounting, from?: Date | null, to?: Date | null): AccountingPdfTable {
  const income = presentIncome(acc.entries, from, to)
  return {
    title: incomeExportTitle(from, to),
    head: ['Item', 'Amount'],
    align: ['left', 'right'],
    body: [
      ['Revenue', ''],
      ...income.revLines.map((r) => [r.label, r.value]),
      ['Total revenue', income.totalRevenue],
      GAP,
      ['Expenses', ''],
      ...income.expLines.map((e) => [e.label, e.value]),
      ['Total expenses', income.totalExpenses],
      GAP,
      ['Net income (profit)', income.netIncome]
    ]
  }
}

function balanceTable(acc: CncAccounting, asOf?: Date | null): AccountingPdfTable {
  const balance = presentBalance(acc.entries, asOf)
  return {
    title: balanceExportTitle(asOf),
    head: ['Item', 'Amount'],
    align: ['left', 'right'],
    body: [
      ['Assets', ''],
      ...balance.assetLines.map((a) => [a.label, a.value]),
      ['Total assets', balance.totalAssets],
      GAP,
      ['Liabilities', ''],
      ...balance.liabLines.map((l) => [l.label, l.value]),
      GAP,
      ['Equity', ''],
      ...balance.equityLines.map((q) => [q.label, q.value]),
      ['Total equity', balance.totalEquity],
      GAP,
      ['Liabilities + Equity', balance.liabilitiesPlusEquity]
    ]
  }
}

function trialTable(acc: CncAccounting, asOf?: Date | null): AccountingPdfTable {
  // Rebuild the ledger over the "as of" slice when a date is set, mirroring the
  // Trial Balance card; otherwise use the pre-built whole-book ledger.
  const ledger = asOf
    ? buildGeneralLedger(filterByPeriod(acc.entries, null, asOf))
    : acc.generalLedger
  const trial = presentTrial(ledger)
  return {
    title: trialExportTitle(asOf),
    head: ['Account', 'Nature', 'Debit', 'Credit'],
    align: ['left', 'left', 'right', 'right'],
    body: [
      ...trial.rows.map((t) => [t.account, t.nature, t.dr, t.cr]),
      ['Total', '', trial.total, trial.total]
    ]
  }
}

/** How each ledger column renders in the export: alignment + cell value. */
const LEDGER_PDF_CELL: Record<
  LedgerColumnKey,
  { align: Align; pick: (r: LedgerRow, resolveName?: ResolveName) => Cell }
> = {
  date: { align: 'left', pick: (r) => r.date },
  action: { align: 'left', pick: (r) => r.cat },
  transaction: { align: 'left', pick: (r) => r.label },
  activity: { align: 'left', pick: (r, resolveName) => activityText(r.activity, resolveName) },
  account: { align: 'left', pick: (r) => r.account },
  dr: { align: 'right', pick: (r) => r.dr },
  cr: { align: 'right', pick: (r) => r.cr },
  currency: { align: 'left', pick: (r) => r.currency },
  quantity: { align: 'right', pick: (r) => r.quantity },
  rate: { align: 'right', pick: (r) => r.rate }
}

interface LedgerTableOptions {
  filter?: string
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
  currencies?: string[]
  account?: string
}

function ledgerTable(
  acc: CncAccounting,
  resolveName?: ResolveName,
  opts: LedgerTableOptions = {}
): AccountingPdfTable {
  const { rows, total } = opts.account
    ? presentAccountLedger(acc.entries, opts.account, opts.to)
    : presentLedger(acc.entries, opts.filter ?? 'All', opts.from, opts.to, opts.currencies)
  const cols = resolveLedgerColumns(opts.columns)
  const body = rows.map((r) => cols.map((c) => LEDGER_PDF_CELL[c.value].pick(r, resolveName)))
  body.push(ledgerTotalRow(cols, total))
  return {
    title: opts.account
      ? accountLedgerTitle(opts.account, opts.to)
      : ledgerExportTitle(opts.filter, opts.from, opts.to),
    head: cols.map((c) => c.label),
    align: cols.map((c) => LEDGER_PDF_CELL[c.value].align),
    body
  }
}

/** Build a single section's table from its spec. */
function sectionTable(
  acc: CncAccounting,
  spec: SectionSpec,
  resolveName?: ResolveName
): AccountingPdfTable {
  switch (spec.key) {
    case 'summary':
      return summaryTable(acc)
    case 'income':
      return incomeTable(acc, spec.from, spec.to)
    case 'balance':
      return balanceTable(acc, spec.asOf)
    case 'trial':
      return trialTable(acc, spec.asOf)
    case 'ledger':
      return ledgerTable(acc, resolveName, {
        filter: spec.filter,
        from: spec.from,
        to: spec.to,
        columns: spec.columns,
        currencies: spec.currencies,
        account: spec.account
      })
  }
}

/** Build tables for an arbitrary section selection, in the order given. */
export function buildTables(
  acc: CncAccounting,
  specs: readonly SectionSpec[],
  resolveName?: ResolveName
): AccountingPdfTable[] {
  return specs.map((spec) => sectionTable(acc, spec, resolveName))
}

/** The four printed tabs (everything except the Summary), in display order. */
export function buildAccountingTables(
  acc: CncAccounting,
  resolveName?: ResolveName
): AccountingPdfTable[] {
  return [incomeTable(acc), balanceTable(acc), trialTable(acc), ledgerTable(acc, resolveName)]
}

// Sober palette: slate-600 header on white, slate-100 zebra stripe.
const HEADER_FILL: [number, number, number] = [71, 85, 105]
const ZEBRA_FILL: [number, number, number] = [241, 245, 249]
const TITLE_COLOR: [number, number, number] = [30, 41, 59]

/** Stamp a single large faint diagonal "CNC Portal" wordmark centred on the page. */
function drawWatermark(doc: import('jspdf').jsPDF): void {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  doc.saveGraphicsState()
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  doc.setGState(new GState({ opacity: 0.08 }) as never)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(90)
  const text = 'CNC Portal'
  const rad = (45 * Math.PI) / 180
  const halfWidth = doc.getTextWidth(text) / 2
  const x = pageW / 2 - halfWidth * Math.cos(rad)
  const y = pageH / 2 + halfWidth * Math.sin(rad)
  doc.text(text, x, y, { angle: 45, baseline: 'middle' })
  doc.restoreGraphicsState()
}

export interface ExportPdfOptions {
  /** Download filename (with `.pdf`). */
  filename: string
  pageBreak?: boolean
}

/** Render the given section tables to a PDF and download it. */
export async function exportTablesPdf(
  tables: AccountingPdfTable[],
  opts: ExportPdfOptions
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const marginX = 40

  // Document title on the first page.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...TITLE_COLOR)
  doc.text('Accounting', marginX, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, 62)

  let cursorY = 84
  tables.forEach((table, index) => {
    if (index > 0) {
      if (opts.pageBreak) {
        doc.addPage()
        cursorY = 56
      } else {
        cursorY =
          (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 32
      }
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...TITLE_COLOR)
    doc.text(table.title, marginX, cursorY)

    const columnStyles: Record<number, { halign: Align }> = {}
    table.align.forEach((halign, col) => {
      columnStyles[col] = { halign }
    })

    autoTable(doc, {
      startY: cursorY + 8,
      margin: { left: marginX, right: marginX },
      head: [table.head],
      body: table.body,
      theme: 'striped',
      styles: { fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: HEADER_FILL,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      alternateRowStyles: { fillColor: ZEBRA_FILL },
      columnStyles,
      didDrawPage: () => drawWatermark(doc)
    })
  })

  doc.save(opts.filename)
}

export async function exportAccountingPdf(
  acc: CncAccounting,
  resolveName?: ResolveName
): Promise<void> {
  await exportTablesPdf(buildAccountingTables(acc, resolveName), { filename: 'cnc-accounting.pdf' })
}
