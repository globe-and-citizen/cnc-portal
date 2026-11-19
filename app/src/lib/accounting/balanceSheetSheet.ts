/** Balance Sheet projection for the spreadsheet exporter, in its on-screen sections. */
import type { AccountingExportSnapshot } from '@/utils/accounting/exportSpec'
import {
  balanceExportRows,
  type BalanceExportRow,
  type BalanceExportRowKind
} from '@/utils/accounting/balanceExportRows'
import { balanceExportTitle, presentBalance } from '@/utils/accounting/presenter'
import type { SheetContent, SheetRows } from './spreadsheet'
import { spreadsheetUsd } from './spreadsheetNumber'

const EMPHASIZED_KINDS: ReadonlySet<BalanceExportRowKind> = new Set([
  'section',
  'columns',
  'total',
  'grandTotal'
])

function cellsOf({ kind, account, nature, value, amount }: BalanceExportRow): SheetRows[number] {
  if (kind === 'gap') return []
  if (kind === 'section') return [account]
  return [account, nature, kind === 'columns' ? value : spreadsheetUsd(amount)]
}

/** The Balance Sheet rows, with its section titles and totals emphasized. */
export function balanceSheetContent(
  books: AccountingExportSnapshot,
  asOf?: Date | null
): SheetContent {
  const exportRows = balanceExportRows(presentBalance(books.journal, asOf))
  const headingRows: SheetRows = [[balanceExportTitle(asOf)], []]
  return {
    rows: [...headingRows, ...exportRows.map(cellsOf)],
    emphasizedRows: exportRows.flatMap(({ kind }, index) =>
      EMPHASIZED_KINDS.has(kind) ? [index + headingRows.length] : []
    )
  }
}
