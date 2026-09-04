/** General Ledger table projection for the PDF exporter. */
import { presentAccountLedger, accountLedgerTitle } from '@/utils/accounting/accountLedger'
import { activityText } from '@/utils/accounting/describeEntry'
import {
  presentJournalLedger,
  journalLedgerExportTitle
} from '@/utils/accounting/journalLedgerPresenter'
import {
  ledgerTotalRow,
  resolveLedgerColumns,
  type LedgerColumnKey,
  type LedgerRow
} from '@/utils/accounting/ledgerPresenter'
import type { CncAccounting } from '@/utils/accounting/assemble'
import type { AccountingPdfTable, ResolveName } from './pdf'

type Cell = string | number
type Align = 'left' | 'right'

/** The options shared by a General Ledger PDF projection and its screen scope. */
export interface GeneralLedgerPdfOptions {
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
  currencies?: string[]
  journalAccounts?: string[]
  account?: string | readonly string[]
  accountLabel?: string
  accountTotal?: string
  instance?: string | null
  unresolved?: boolean
}

/** How each ledger column renders in the PDF: alignment + cell value. */
const PDF_CELL: Record<
  LedgerColumnKey,
  { align: Align; pick: (row: LedgerRow, resolveName?: ResolveName) => Cell }
> = {
  date: { align: 'left', pick: (row) => row.date },
  action: { align: 'left', pick: (row) => row.category },
  transaction: { align: 'left', pick: (row) => row.label },
  activity: { align: 'left', pick: (row, resolveName) => activityText(row.activity, resolveName) },
  account: { align: 'left', pick: (row) => row.accountLabel ?? row.account },
  dr: { align: 'right', pick: (row) => row.dr },
  cr: { align: 'right', pick: (row) => row.cr },
  currency: { align: 'left', pick: (row) => row.currency },
  quantity: { align: 'right', pick: (row) => row.quantity },
  rate: { align: 'right', pick: (row) => row.rate }
}

/** Display name for a drill-down: the account, or the aggregate's label. */
function drillName(opts: GeneralLedgerPdfOptions): string {
  return Array.isArray(opts.account) ? (opts.accountLabel ?? 'Ledger') : (opts.account as string)
}

/** Build the General Ledger PDF table from journal entries or a legacy account drill-down. */
export function generalLedgerPdfTable(
  books: CncAccounting,
  resolveName?: ResolveName,
  opts: GeneralLedgerPdfOptions = {}
): AccountingPdfTable {
  const { rows, total } = opts.account
    ? presentAccountLedger(books.entries, opts.account, opts.from, opts.to, opts.accountTotal, {
        instance: opts.instance,
        unresolved: opts.unresolved
      })
    : presentJournalLedger(books.journal, opts.from, opts.to, opts.currencies, opts.journalAccounts)
  const columns = resolveLedgerColumns(opts.columns)
  const body = rows.map((row) =>
    columns.map((column) => PDF_CELL[column.value].pick(row, resolveName))
  )
  body.push(ledgerTotalRow(columns, total))
  return {
    title: opts.account
      ? accountLedgerTitle(drillName(opts), opts.from, opts.to)
      : journalLedgerExportTitle(opts.from, opts.to),
    head: columns.map((column) => column.label),
    align: columns.map((column) => PDF_CELL[column.value].align),
    body
  }
}
