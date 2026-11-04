/**
 * Print the accounting books to a downloadable PDF.
 *
 * Section tables — Summary, Income Statement, Balance Sheet, Trial Balance,
 * General Ledger, Account Assignments — are built by pure, unit-tested functions that read the live
 * engine output ({@link AccountingExportSnapshot}) through the same presenters the view and
 * the Excel export use. {@link buildTables} builds the requested sections for
 * the Summary export modal and per-page exports. {@link exportTablesPdf}
 * lazy-loads jsPDF + autotable, renders each table with a sober header colour
 * and zebra-striped rows, stamps a diagonal "CNC Portal" watermark on every
 * page, and downloads the file.
 */
import type { AccountingExportSnapshot } from '@/utils/accounting/exportSpec'
import {
  presentIncome,
  presentBalance,
  presentTrial,
  presentSummary,
  incomeExportTitle,
  balanceExportTitle,
  trialExportTitle
} from '@/utils/accounting/presenter'
import type { SectionSpec } from '@/utils/accounting/exportSpec'
import { formatDateTime } from '@/utils/format'
import {
  ACCOUNT_ASSIGNMENTS_TITLE,
  ACCOUNT_ASSIGNMENT_COLUMNS,
  assignmentStatus,
  presentJournalAccountAssignments
} from '@/utils/accounting/journalAccountAssignmentPresenter'
import { generalLedgerPdfTable, txHashCell } from './generalLedgerPdfTable'

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
  /**
   * Relative width per column; the page width is split in these proportions.
   * Without it autotable sizes columns from their content.
   */
  widths?: number[]
  /** Text size and cell padding (defaults to {@link DEFAULT_TYPOGRAPHY}). */
  typography?: PdfTableTypography
}

/** Text size and cell padding of a printed table, in points. */
export interface PdfTableTypography {
  fontSize: number
  cellPadding: number
}

const DEFAULT_TYPOGRAPHY: PdfTableTypography = { fontSize: 10, cellPadding: 6 }

/** A blank spacer row, used to separate sub-sections inside a statement. */
const GAP: Cell[] = ['', '']

function summaryTable(books: AccountingExportSnapshot): AccountingPdfTable {
  const { cards, banner } = presentSummary(books.journal)
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
  books: AccountingExportSnapshot,
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

function balanceTable(books: AccountingExportSnapshot, asOf?: Date | null): AccountingPdfTable {
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
      ['Total liabilities', balance.totalLiabilities],
      GAP,
      ['Equity', ''],
      ...balance.equityLines.map((line) => [line.label, line.value]),
      ['Total equity', balance.totalEquity],
      GAP,
      ['Earnings to date calculation', ''],
      ...balance.earningsLines.map((line) => [line.label, line.value]),
      ['Earnings to date', balance.earningsToDate],
      GAP,
      ['Liabilities + Equity', balance.liabilitiesPlusEquity]
    ]
  }
}

function trialTable(books: AccountingExportSnapshot, asOf?: Date | null): AccountingPdfTable {
  const trial = presentTrial(books.journal, asOf)
  return {
    title: trialExportTitle(asOf),
    head: ['Account', 'Nature', 'Debit', 'Credit'],
    align: ['left', 'left', 'right', 'right'],
    body: [
      ...trial.rows.map((t) => [t.label, t.nature, t.dr, t.cr]),
      ['Total', '', trial.totalDebit, trial.totalCredit]
    ]
  }
}

function assignmentsTable(books: AccountingExportSnapshot): AccountingPdfTable {
  const { rows } = presentJournalAccountAssignments(books.journal)
  return {
    title: ACCOUNT_ASSIGNMENTS_TITLE,
    head: ACCOUNT_ASSIGNMENT_COLUMNS.map((column) => column.label),
    align: ['left', 'left', 'left', 'left', 'left', 'right', 'right', 'left'],
    widths: [160, 180, 150, 200, 100, 120, 120, 280],
    body: rows.map((row) => [
      row.date,
      row.label,
      txHashCell(row),
      row.accountLabel ?? row.account,
      row.currency,
      row.dr,
      row.cr,
      assignmentStatus(row)
    ])
  }
}

/** Build a single section's table from its spec. */
function sectionTable(
  books: AccountingExportSnapshot,
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
        journalAccountLabel: spec.journalAccountLabel,
        journalAccountMovements: spec.journalAccountMovements
      })
    case 'assignments':
      return assignmentsTable(books)
  }
}

/** Build tables for an arbitrary section selection, in the order given. */
export function buildTables(
  books: AccountingExportSnapshot,
  specs: readonly SectionSpec[],
  resolveName?: ResolveName
): AccountingPdfTable[] {
  return specs.map((spec) => sectionTable(books, spec, resolveName))
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
  /** Team whose books these are, printed in the document title. */
  teamName?: string
  /** Span of activity the books record, printed under the title. */
  coverage?: string | null
}

/** The document title and the line under it, naming whose books and which period. */
export function documentHeading(
  { teamName, coverage }: Pick<ExportPdfOptions, 'teamName' | 'coverage'>,
  generatedAt: Date
) {
  return {
    title: teamName ? `Accounting — ${teamName}` : 'Accounting',
    subtitle: [coverage, `Generated ${formatDateTime(generatedAt)}`].filter(Boolean).join(' · ')
  }
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

  const heading = documentHeading(opts, new Date())
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...TITLE_COLOR)
  doc.text(heading.title, marginX, 46)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(heading.subtitle, marginX, 62)

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

    const { fontSize, cellPadding } = table.typography ?? DEFAULT_TYPOGRAPHY
    const tableWidth = doc.internal.pageSize.getWidth() - 2 * marginX

    autoTable(doc, {
      startY: cursorY + 8,
      margin: { left: marginX, right: marginX },
      head: [table.head],
      body: table.body,
      theme: 'striped',
      styles: { fontSize, cellPadding, textColor: [30, 41, 59] },
      headStyles: {
        fillColor: HEADER_FILL,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize
      },
      alternateRowStyles: { fillColor: ZEBRA_FILL },
      columnStyles: columnStylesOf(table, tableWidth),
      didDrawPage: () => drawWatermark(doc)
    })
  })

  doc.save(opts.filename)
}

/**
 * Per-column autotable styles: the alignment, plus a fixed width when the table
 * declares relative widths. Fixed widths keep one long unbreakable cell from
 * starving its neighbours down to a letter per line.
 */
function columnStylesOf(
  { align, widths }: AccountingPdfTable,
  tableWidth: number
): Record<number, { halign: Align; cellWidth?: number }> {
  const totalWeight = widths?.reduce((sum, weight) => sum + weight, 0) ?? 0
  return Object.fromEntries(
    align.map((halign, col) => {
      const weight = widths?.[col]
      return [
        col,
        weight && totalWeight
          ? { halign, cellWidth: (weight / totalWeight) * tableWidth }
          : { halign }
      ]
    })
  )
}
