/** General Ledger table projection for the PDF exporter. */
import { accountLedgerTitle } from '@/utils/accounting/accountLedger'
import { activityText } from '@/utils/accounting/describeEntry'
import {
  presentJournalLedger,
  journalLedgerExportTitle,
  type LedgerRow
} from '@/utils/accounting/journalLedgerPresenter'
import {
  LEDGER_COLUMN_WIDTHS,
  ledgerTotalRow,
  resolveLedgerColumns,
  type LedgerColumnKey
} from '@/utils/accounting/ledgerColumns'
import type { AccountingExportSnapshot } from '@/utils/accounting/exportSpec'
import { formatTxHash } from '@/utils/format'
import type { AccountingPdfTable, PdfTableTypography, ResolveName } from './pdf'

type Cell = string | number
type Align = 'left' | 'right'

/** Up to eleven columns share a landscape page, so the ledger prints smaller than the statements. */
const LEDGER_TYPOGRAPHY: PdfTableTypography = { fontSize: 8, cellPadding: 4 }

/** The hash shortened as on screen, a dash on a posting without one, blank on its follow-up lines. */
export function txHashCell(row: LedgerRow): string {
  if (!row.isFirst) return ''
  return row.txHash ? formatTxHash(row.txHash) : '—'
}

/** The options shared by a General Ledger PDF projection and its screen scope. */
interface GeneralLedgerPdfOptions {
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
  currencies?: string[]
  journalAccounts?: string[]
  journalAccountLabel?: string
  journalAccountTotal?: string
}

/** How each ledger column renders in the PDF: alignment + cell value. */
const PDF_CELL: Record<
  LedgerColumnKey,
  { align: Align; pick: (row: LedgerRow, resolveName?: ResolveName) => Cell }
> = {
  date: { align: 'left', pick: (row) => row.date },
  action: { align: 'left', pick: (row) => row.category },
  transaction: { align: 'left', pick: (row) => row.label },
  txHash: { align: 'left', pick: txHashCell },
  activity: { align: 'left', pick: (row, resolveName) => activityText(row.activity, resolveName) },
  account: { align: 'left', pick: (row) => row.accountLabel ?? row.account },
  dr: { align: 'right', pick: (row) => row.dr },
  cr: { align: 'right', pick: (row) => row.cr },
  currency: { align: 'left', pick: (row) => row.currency },
  quantity: { align: 'right', pick: (row) => row.quantityDisplay ?? row.quantity },
  rate: { align: 'right', pick: (row) => row.rate }
}

/** Build a General Ledger PDF table from the canonical journal. */
export function generalLedgerPdfTable(
  books: AccountingExportSnapshot,
  resolveName?: ResolveName,
  opts: GeneralLedgerPdfOptions = {}
): AccountingPdfTable {
  const journal = presentJournalLedger(
    books.journal,
    opts.from,
    opts.to,
    opts.currencies,
    opts.journalAccounts
  )
  const total = opts.journalAccountTotal ?? journal.total
  const columns = resolveLedgerColumns(opts.columns)
  const body = journal.rows.map((row) =>
    columns.map((column) => PDF_CELL[column.value].pick(row, resolveName))
  )
  body.push(ledgerTotalRow(columns, total))
  return {
    title: opts.journalAccountLabel
      ? accountLedgerTitle(opts.journalAccountLabel, opts.from, opts.to)
      : journalLedgerExportTitle(opts.from, opts.to),
    head: columns.map((column) => column.label),
    align: columns.map((column) => PDF_CELL[column.value].align),
    widths: columns.map((column) => LEDGER_COLUMN_WIDTHS[column.value]),
    typography: LEDGER_TYPOGRAPHY,
    body
  }
}
