/**
 * Currency derivation + filtering for the general ledger — split from
 * {@link ./ledgerPresenter} so each module stays focused. Drives the
 * General-ledger currency selector (spec §2 "Devise"): which currencies are in
 * view and narrowing the entries to a chosen subset. Pure and unit-testable.
 */
import { currencySymbol } from './presenter'
import type { LedgerEntry } from './ledgerEntry'

/**
 * The currency symbol an entry is filtered / grouped by in the ledger — the
 * entry's own token. Every filter (the `Fee` pseudo-category included) keeps whole
 * transactions in view, so the transaction's currency is always its own token
 * rather than a fee leg's (issue #2678).
 */
export function entryCurrency(entry: LedgerEntry): string {
  return currencySymbol(entry.token)
}

/**
 * The distinct currencies present across the given entries, sorted, feeding the
 * General-ledger currency selector — recomputed as the upstream category / date /
 * fee filters change, so it always reflects the data currently in view.
 */
export function ledgerCurrencies(entries: readonly LedgerEntry[]): string[] {
  const seen = new Set<string>()
  for (const entry of entries) seen.add(entryCurrency(entry))
  return [...seen].sort()
}

/**
 * Narrow entries to the selected currencies (an empty selection keeps none,
 * mirroring the multi-select). Applied after the category / date / fee filter so
 * the currency filter combines with them.
 */
export function filterLedgerByCurrency(
  entries: readonly LedgerEntry[],
  currencies: readonly string[]
): LedgerEntry[] {
  return entries.filter((e) => currencies.includes(entryCurrency(e)))
}
