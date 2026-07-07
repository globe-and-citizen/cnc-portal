/**
 * Print the accounting books to a downloadable PDF.
 *
 * One table per tab — Income Statement, Balance Sheet, Trial Balance, General Ledger —
 * i.e. every tab except the Summary, mirroring the Excel export. Table construction
 * ({@link buildAccountingTables}) is pure and unit-tested; it reads the live engine
 * output ({@link CncAccounting}) through the same presenters the view and the Excel
 * export use. {@link exportAccountingPdf} lazy-loads jsPDF + autotable, renders each
 * table with a sober header colour and zebra-striped rows, stamps a diagonal
 * "CNC Portal" watermark on every page, and downloads the file on click.
 */
import type { CncAccounting } from '@/utils/accounting/assemble'
import { presentIncome, presentBalance, presentTrial } from '@/utils/accounting/presenter'
import { presentLedger } from '@/utils/accounting/ledgerPresenter'
import { activityText } from '@/utils/accounting/describeEntry'

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

function incomeTable(acc: CncAccounting): AccountingPdfTable {
  const income = presentIncome(acc.entries)
  return {
    title: 'Income Statement',
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

function balanceTable(acc: CncAccounting): AccountingPdfTable {
  const balance = presentBalance(acc.entries)
  return {
    title: 'Balance Sheet',
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

function trialTable(acc: CncAccounting): AccountingPdfTable {
  const trial = presentTrial(acc.generalLedger)
  return {
    title: 'Trial Balance',
    head: ['Account', 'Nature', 'Debit', 'Credit'],
    align: ['left', 'left', 'right', 'right'],
    body: [
      ...trial.rows.map((t) => [t.account, t.nature, t.dr, t.cr]),
      ['Total', '', trial.total, trial.total]
    ]
  }
}

function ledgerTable(acc: CncAccounting, resolveName?: ResolveName): AccountingPdfTable {
  const { rows } = presentLedger(acc.entries, 'All')
  return {
    title: 'General Ledger',
    head: ['Date', 'Action', 'Transaction', 'Activity', 'Account', 'Debit', 'Credit'],
    align: ['left', 'left', 'left', 'left', 'left', 'right', 'right'],
    body: rows.map((r) => [
      r.date,
      r.cat,
      r.label,
      activityText(r.activity, resolveName),
      r.account,
      r.dr,
      r.cr
    ])
  }
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
  // jsPDF exposes GState off the instance; opacity keeps the mark behind the data.
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  doc.setGState(new GState({ opacity: 0.08 }) as never)
  doc.setTextColor(120, 120, 120)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(90)
  // Offset the anchor by half the text width along the 45° baseline so the mark's
  // midpoint lands on the page centre (jsPDF's `align: 'center'` misbehaves with `angle`).
  const text = 'CNC Portal'
  const rad = (45 * Math.PI) / 180
  const halfWidth = doc.getTextWidth(text) / 2
  const x = pageW / 2 - halfWidth * Math.cos(rad)
  const y = pageH / 2 + halfWidth * Math.sin(rad)
  doc.text(text, x, y, { angle: 45, baseline: 'middle' })
  doc.restoreGraphicsState()
}

export async function exportAccountingPdf(
  acc: CncAccounting,
  resolveName?: ResolveName
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const marginX = 40
  const tables = buildAccountingTables(acc, resolveName)

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
      cursorY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 32
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

  doc.save('cnc-accounting.pdf')
}
