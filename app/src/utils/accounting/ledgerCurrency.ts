/**
 * Currency derivation + filtering for the general ledger — split from
 * {@link ./ledgerPresenter} so each module stays focused. Drives the
 * General-ledger currency selector (spec §2 "Devise"): which currencies are in
 * view and narrowing the entries to a chosen subset. Pure and unit-testable.
 */
import { currencySymbol } from './presenter'
import type { LedgerEntry } from './ledgerEntry'

/**
 * The currency symbol an entry is filtered / grouped by in the ledger — the fee
 * leg's token under the Fee filter (that's the row rendered), otherwise the
 * entry's own token.
 */
export function entryCurrency(entry: LedgerEntry, isFeeFilter = false): string {
  const token = isFeeFilter ? (entry.mergedBankFee?.token ?? entry.token) : entry.token
  return currencySymbol(token)
}

/**
 * The distinct currencies present across the given entries, sorted, feeding the
 * General-ledger currency selector — recomputed as the upstream category / date /
 * fee filters change, so it always reflects the data currently in view.
 */
export function ledgerCurrencies(entries: readonly LedgerEntry[], isFeeFilter = false): string[] {
  const seen = new Set<string>()
  for (const entry of entries) seen.add(entryCurrency(entry, isFeeFilter))
  return [...seen].sort()
}

/**
 * Narrow entries to the selected currencies (an empty selection keeps none,
 * mirroring the multi-select). Applied after the category / date / fee filter so
 * the currency filter combines with them.
 */
export function filterLedgerByCurrency(
  entries: readonly LedgerEntry[],
  currencies: readonly string[],
  isFeeFilter = false
): LedgerEntry[] {
  return entries.filter((e) => currencies.includes(entryCurrency(e, isFeeFilter)))
}
