/** General Ledger row projection for the spreadsheet exporter. */
import { accountLedgerTitle } from '@/utils/accounting/accountLedger'
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
import type { ResolveName } from './spreadsheet'

type Cell = string | number
type SheetRows = Cell[][]

/** The options shared by a General Ledger spreadsheet projection and its screen scope. */
export interface GeneralLedgerSheetOptions {
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
  currencies?: string[]
  journalAccounts?: string[]
  journalAccountLabel?: string
  journalAccountTotal?: string
}

/** Convert one displayed amount to a spreadsheet number, preserving blank cells. */
function usd(value: string): number | '' {
  if (!value || value === '—') return ''
  const number = Number(value.replace(/[$,]/g, ''))
  return Number.isNaN(number) ? '' : number
}

/** How each ledger column renders in the spreadsheet. */
const SHEET_CELL: Record<LedgerColumnKey, (row: LedgerRow, resolveName?: ResolveName) => Cell> = {
  date: (row) => row.date,
  action: (row) => row.category,
  transaction: (row) => row.label,
  txHash: (row) => row.txHash ?? '',
  activity: (row, resolveName) => activityText(row.activity, resolveName),
  account: (row) => row.accountLabel ?? row.account,
  dr: (row) => usd(row.dr),
  cr: (row) => usd(row.cr),
  currency: (row) => row.currency,
  quantity: (row) => usd(row.quantity),
  rate: (row) => usd(row.rate)
}

/** Build General Ledger spreadsheet rows from the canonical journal. */
export function generalLedgerSheetRows(
  books: CncAccounting,
  resolveName?: ResolveName,
  opts: GeneralLedgerSheetOptions = {}
): SheetRows {
  const journal = presentJournalLedger(
    books.journal,
    opts.from,
    opts.to,
    opts.currencies,
    opts.journalAccounts
  )
  const total = opts.journalAccountTotal ?? journal.total
  const columns = resolveLedgerColumns(opts.columns)
  return [
    [
      opts.journalAccountLabel
        ? accountLedgerTitle(opts.journalAccountLabel, opts.from, opts.to)
        : journalLedgerExportTitle(opts.from, opts.to)
    ],
    [],
    columns.map((column) => column.label),
    ...journal.rows.map((row) =>
      columns.map((column) => SHEET_CELL[column.value](row, resolveName))
    ),
    ledgerTotalRow(columns, usd(total))
  ]
}
