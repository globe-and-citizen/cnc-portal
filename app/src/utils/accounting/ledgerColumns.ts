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
export type LedgerColumn = { value: LedgerColumnKey; label: string }

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
 * The visible ledger columns for an export, in canonical order — an empty or
 * absent selection means "all columns". Shared by the PDF and Excel exporters so
 * both honour the same order regardless of the order columns were toggled.
 */
export function resolveLedgerColumns(columns?: readonly LedgerColumnKey[]): LedgerColumn[] {
  const visible = columns && columns.length ? columns : LEDGER_COLUMNS.map((column) => column.value)
  return LEDGER_COLUMNS.filter((column) => visible.includes(column.value))
}

/**
 * The trailing "Total movements" row for an exported ledger, mirroring the
 * on-screen footer: the grand total in the Debit and Credit columns — as the
 * caller's already-rendered `amount` (a `$`-string for the PDF, a number for
 * Excel) — with the label in the Transaction column, or the first non-amount
 * column when Transaction is hidden.
 */
export function ledgerTotalRow(
  columns: readonly LedgerColumn[],
  amount: string | number
): (string | number)[] {
  const labelKey = columns.some((column) => column.value === 'transaction')
    ? 'transaction'
    : columns.find((column) => column.value !== 'dr' && column.value !== 'cr')?.value
  return columns.map((column) => {
    if (column.value === 'dr' || column.value === 'cr') return amount
    if (column.value === labelKey) return 'Total movements'
    return ''
  })
}
