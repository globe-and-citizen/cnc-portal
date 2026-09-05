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
import type { SectionSpec } from '@/utils/accounting/exportSpec'
import { formatDateTime } from '@/utils/format'
import { generalLedgerPdfTable } from './generalLedgerPdfTable'

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

function summaryTable(books: CncAccounting): AccountingPdfTable {
  const cards = presentSummaryCards(books.summary, books.incomeStatement, books.balanceSheet)
  const banner = presentBanner(books.balanceSheet, books.generalLedger)
  return {
    title: 'Summary',
    head: ['Metric', 'Value'],
    align: ['left', 'right'],
    body: [
      ...cards.map((card) => [card.label, card.value]),
      GAP,
      ['Books balanced', banner.balanced ? 'Yes' : 'No'],
      ['Accounting identity', banner.identity],
      ['Trial balance', banner.trial]
    ]
  }
}

function incomeTable(
  books: CncAccounting,
  from?: Date | null,
  to?: Date | null
): AccountingPdfTable {
  const income = presentIncome(books.journal, from, to)
  return {
    title: incomeExportTitle(from, to),
    head: ['Item', 'Amount'],
    align: ['left', 'right'],
    body: [
      ['Revenue', ''],
      ...income.revenueLines.map((line) => [line.label, line.value]),
      ['Total revenue', income.totalRevenue],
      GAP,
      ['Expenses', ''],
      ...income.expenseLines.map((line) => [line.label, line.value]),
      ['Total expenses', income.totalExpenses],
      GAP,
      ['Net income (profit)', income.netIncome]
    ]
  }
}

function balanceTable(books: CncAccounting, asOf?: Date | null): AccountingPdfTable {
  const balance = presentBalance(books.journal, asOf)
  return {
    title: balanceExportTitle(asOf),
    head: ['Item', 'Amount'],
    align: ['left', 'right'],
    body: [
      ['Assets', ''],
      ...balance.assetLines.map((line) => [line.label, line.value]),
      ['Total assets', balance.totalAssets],
      GAP,
      ['Liabilities', ''],
      ...balance.liabilityLines.map((line) => [line.label, line.value]),
      GAP,
      ['Equity', ''],
      ...balance.equityLines.map((line) => [line.label, line.value]),
      ['Total equity', balance.totalEquity],
      GAP,
      ['Liabilities + Equity', balance.liabilitiesPlusEquity]
    ]
  }
}

function trialTable(books: CncAccounting, asOf?: Date | null): AccountingPdfTable {
  const ledger = asOf
    ? buildGeneralLedger(filterByPeriod(books.journal, null, asOf))
    : books.generalLedger
  const trial = presentTrial(ledger)
  return {
    title: trialExportTitle(asOf),
    head: ['Account', 'Nature', 'Debit', 'Credit'],
    align: ['left', 'left', 'right', 'right'],
    body: [
      ...trial.rows.map((t) => [t.label, t.nature, t.dr, t.cr]),
      ['Total', '', trial.total, trial.total]
    ]
  }
}

/** Build a single section's table from its spec. */
function sectionTable(
  books: CncAccounting,
  spec: SectionSpec,
  resolveName?: ResolveName
): AccountingPdfTable {
  switch (spec.key) {
    case 'summary':
      return summaryTable(books)
    case 'income':
      return incomeTable(books, spec.from, spec.to)
    case 'balance':
      return balanceTable(books, spec.asOf)
    case 'trial':
      return trialTable(books, spec.asOf)
    case 'ledger':
      return generalLedgerPdfTable(books, resolveName, {
        from: spec.from,
        to: spec.to,
        columns: spec.columns,
        currencies: spec.currencies,
        journalAccounts: spec.journalAccounts,
        account: spec.account,
        accountLabel: spec.accountLabel,
        accountTotal: spec.accountTotal,
        instance: spec.instance,
        unresolved: spec.unresolved
      })
  }
}

/** Build tables for an arbitrary section selection, in the order given. */
export function buildTables(
  books: CncAccounting,
  specs: readonly SectionSpec[],
  resolveName?: ResolveName
): AccountingPdfTable[] {
  return specs.map((spec) => sectionTable(books, spec, resolveName))
}

/** The four printed tabs (everything except the Summary), in display order. */
export function buildAccountingTables(
  books: CncAccounting,
  resolveName?: ResolveName
): AccountingPdfTable[] {
  return [
    incomeTable(books),
    balanceTable(books),
    trialTable(books),
    generalLedgerPdfTable(books, resolveName)
  ]
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
  doc.text(`Generated ${formatDateTime(new Date())}`, marginX, 62)

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
  books: CncAccounting,
  resolveName?: ResolveName
): Promise<void> {
  await exportTablesPdf(buildAccountingTables(books, resolveName), {
    filename: 'cnc-accounting.pdf'
  })
}
