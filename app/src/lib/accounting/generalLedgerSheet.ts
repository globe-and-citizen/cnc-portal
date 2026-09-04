/** General Ledger row projection for the spreadsheet exporter. */
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
  account?: string | readonly string[]
  accountLabel?: string
  accountTotal?: string
  instance?: string | null
  unresolved?: boolean
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
  activity: (row, resolveName) => activityText(row.activity, resolveName),
  account: (row) => row.accountLabel ?? row.account,
  dr: (row) => usd(row.dr),
  cr: (row) => usd(row.cr),
  currency: (row) => row.currency,
  quantity: (row) => usd(row.quantity),
  rate: (row) => usd(row.rate)
}

/** Display name for a drill-down: the account, or the aggregate's label. */
function drillName(opts: GeneralLedgerSheetOptions): string {
  return Array.isArray(opts.account) ? (opts.accountLabel ?? 'Ledger') : (opts.account as string)
}

/** Build General Ledger spreadsheet rows from journal entries or a legacy account drill-down. */
export function generalLedgerSheetRows(
  books: CncAccounting,
  resolveName?: ResolveName,
  opts: GeneralLedgerSheetOptions = {}
): SheetRows {
  const { rows, total } = opts.account
    ? presentAccountLedger(books.entries, opts.account, opts.from, opts.to, opts.accountTotal, {
        instance: opts.instance,
        unresolved: opts.unresolved
      })
    : presentJournalLedger(books.journal, opts.from, opts.to, opts.currencies, opts.journalAccounts)
  const columns = resolveLedgerColumns(opts.columns)
  return [
    [
      opts.account
        ? accountLedgerTitle(drillName(opts), opts.from, opts.to)
        : journalLedgerExportTitle(opts.from, opts.to)
    ],
    [],
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => SHEET_CELL[column.value](row, resolveName))),
    ledgerTotalRow(columns, usd(total))
  ]
}
