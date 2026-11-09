/**
 * The general-ledger table columns — the single list the show/hide selector, the
 * table and both exporters read, so an exported ledger keeps the exact columns
 * (and order) the screen shows.
 */

/** The toggleable ledger table columns (keys match the table's cell slots). */
export type LedgerColumnKey =
  | 'date'
  | 'action'
  | 'transaction'
  | 'txHash'
  | 'activity'
  | 'account'
  | 'dr'
  | 'cr'
  | 'currency'
  | 'quantity'
  | 'rate'

/** A ledger column as rendered in the selector and the exports. */
type LedgerColumn = { value: LedgerColumnKey; label: string }

/**
 * Ledger columns as `{ value, label }`, for the show/hide-columns selector.
 * Devise / Quantité / Taux (spec §2) lead the USD debit/credit so each posting
 * reads "native currency · quantity · rate of record · $ moved".
 */
export const LEDGER_COLUMNS: ReadonlyArray<LedgerColumn> = [
  { value: 'date', label: 'Date' },
  { value: 'action', label: 'Action' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'txHash', label: 'Tx hash' },
  { value: 'activity', label: 'Activity' },
  { value: 'account', label: 'Account' },
  { value: 'currency', label: 'Currency' },
  { value: 'quantity', label: 'Quantity' },
  { value: 'rate', label: 'Rate' },
  { value: 'dr', label: 'Debit' },
  { value: 'cr', label: 'Credit' }
]

/**
 * Default on-screen width (px) of each ledger column. The PDF splits the page in
 * the same proportions, so the printed ledger keeps the screen's compaction.
 */
export const LEDGER_COLUMN_WIDTHS: Readonly<Record<LedgerColumnKey, number>> = {
  date: 160,
  action: 120,
  transaction: 180,
  txHash: 180,
  activity: 320,
  account: 200,
  currency: 100,
  quantity: 120,
  rate: 100,
  dr: 120,
  cr: 120
}

/**
 * The visible ledger columns for an export, in canonical order — an empty or
 * absent selection means "all columns". Shared by the PDF and Excel exporters so
 * both honour the same order regardless of the order columns were toggled.
 */
export function resolveLedgerColumns(columns?: readonly LedgerColumnKey[]): LedgerColumn[] {
  const visible = columns && columns.length ? columns : LEDGER_COLUMNS.map((column) => column.value)
  return LEDGER_COLUMNS.filter((column) => visible.includes(column.value))
}

/**
 * The Debit and Credit figures of a "Total movements" row: one account's own
 * debits and credits in a drill-down, the balanced grand total in both columns
 * for the whole ledger.
 */
export interface LedgerMovements<Amount = string> {
  debit: Amount
  credit: Amount
}

/**
 * The trailing "Total movements" row for an exported ledger, mirroring the
 * on-screen footer: the movements in the Debit and Credit columns — as the
 * caller's already-rendered amounts (`$`-strings for the PDF, numbers for
 * Excel) — with the label in the Transaction column, or the first non-amount
 * column when Transaction is hidden.
 */
export function ledgerTotalRow(
  columns: readonly LedgerColumn[],
  movements: LedgerMovements<string | number>
): (string | number)[] {
  const labelKey = columns.some((column) => column.value === 'transaction')
    ? 'transaction'
    : columns.find((column) => column.value !== 'dr' && column.value !== 'cr')?.value
  return columns.map((column) => {
    if (column.value === 'dr') return movements.debit
    if (column.value === 'cr') return movements.credit
    if (column.value === labelKey) return 'Total movements'
    return ''
  })
}
