/**
 * Presentation-only: fold the per-shareholder legs of one dividend distribution
 * into a single compound posting for the general-ledger view — one itemized debit
 * per shareholder then one aggregated credit out of Cash — Bank. The canonical
 * entries and the statements they feed are untouched. Mirrors
 * {@link ./payrollGrouping} and {@link ./creditGrouping}.
 */
import { formatUsd } from '@/utils/format'
import type { LedgerEntry } from './ledgerEntry'
import type { LedgerRow } from './ledgerPresenter'

const DISTRIBUTION_LABEL = 'Dividend distributed'

/**
 * The key legs of one distribution share; `null` for anything that stands alone.
 * A distribution is mono-currency, so its legs share the token and block timestamp.
 */
export function dividendGroupKey(entry: LedgerEntry): string | null {
  return entry.useCase === 'UC-INV-01' ? `dividend|${entry.token}|${entry.timestamp}` : null
}

/**
 * Render a distribution as one posting: an itemized debit per shareholder (largest
 * first, each keeping its own narration) then one aggregated credit. The lead row
 * carries the Date / Action head; the rest render head-less. `rowsOf` is injected
 * so this module needs no runtime dependency on the presenter.
 */
export function compoundDividendRows(
  group: readonly LedgerEntry[],
  rowsOf: (entry: LedgerEntry) => LedgerRow[]
): LedgerRow[] {
  const ordered = [...group].sort((a, b) => b.amountUsd - a.amountUsd)
  const total = ordered.reduce((sum, entry) => sum + entry.amountUsd, 0)

  const debitRows = ordered
    .map((entry) => rowsOf(entry)[0])
    .filter((row): row is LedgerRow => row != null)
  const creditRow = rowsOf(ordered[0]!)[1]
  const rows = creditRow ? [...debitRows, { ...creditRow, cr: formatUsd(total) }] : debitRows

  return rows.map((row, i) =>
    i === 0
      ? { ...row, label: DISTRIBUTION_LABEL }
      : {
          ...row,
          isFirst: false,
          date: '',
          label: '',
          destination: null,
          cat: '',
          catClass: ''
        }
  )
}
