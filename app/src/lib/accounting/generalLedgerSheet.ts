/** General Ledger row projection for the spreadsheet exporter. */
import { accountLedgerTitle } from '@/utils/accounting/accountLedger'
import { activityText } from '@/utils/accounting/describeEntry'
import {
  presentJournalLedger,
  journalLedgerExportTitle,
  type LedgerRow
} from '@/utils/accounting/journalLedgerPresenter'
import {
  ledgerTotalRow,
  resolveLedgerColumns,
  type LedgerColumnKey,
  type LedgerMovements
} from '@/utils/accounting/ledgerColumns'
import type { AccountingExportSnapshot } from '@/utils/accounting/exportSpec'
import type { ResolveName } from './spreadsheet'
import type { UsdAmount } from '@/utils/accounting/types'
import { spreadsheetNumber, spreadsheetUsd } from './spreadsheetNumber'

type Cell = string | number
type SheetRows = Cell[][]

/** The options shared by a General Ledger spreadsheet projection and its screen scope. */
interface GeneralLedgerSheetOptions {
  from?: Date | null
  to?: Date | null
  columns?: LedgerColumnKey[]
  currencies?: string[]
  journalAccounts?: string[]
  journalAccountLabel?: string
  journalAccountAmounts?: LedgerMovements<UsdAmount>
}

/** How each ledger column renders in the spreadsheet. */
const SHEET_CELL: Record<LedgerColumnKey, (row: LedgerRow, resolveName?: ResolveName) => Cell> = {
  date: (row) => row.date,
  action: (row) => row.category,
  transaction: (row) => row.label,
  txHash: (row) => row.txHash ?? '',
  activity: (row, resolveName) => activityText(row.activity, resolveName),
  account: (row) => row.accountLabel ?? row.account,
  dr: (row) => (row.debitAmount ? spreadsheetUsd(row.debitAmount) : ''),
  cr: (row) => (row.creditAmount ? spreadsheetUsd(row.creditAmount) : ''),
  currency: (row) => row.currency,
  quantity: (row) =>
    !row.currency
      ? ''
      : row.quantityDisplay?.startsWith('<')
        ? row.quantityDisplay
        : spreadsheetNumber(row.quantityValue, 6),
  rate: (row) => (!row.currency ? '' : spreadsheetNumber(row.rateValue, 6))
}

/** Build General Ledger spreadsheet rows from the canonical journal. */
export function generalLedgerSheetRows(
  books: AccountingExportSnapshot,
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
  const total = journal.rows.reduce((sum, row) => sum + (row.debitAmount ?? 0n), 0n)
  const movements =
    opts.journalAccountAmounts ??
    (opts.journalAccountLabel ? null : { debit: total, credit: total })
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
    ledgerTotalRow(columns, {
      debit: movements ? spreadsheetUsd(movements.debit) : 'Unavailable',
      credit: movements ? spreadsheetUsd(movements.credit) : 'Unavailable'
    })
  ]
}
