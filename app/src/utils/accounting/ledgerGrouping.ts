/**
 * How the general-ledger journal folds several postings into one compound entry.
 *
 * Two source events produce more than one balanced pair — a wage paid across
 * several currencies, and a lender's credit position — and both read better as a
 * single entry than as repeated postings. Each has its own key and its own
 * rendering shape ({@link ./payrollGrouping}, {@link ./creditGrouping}); this
 * module is only the dispatcher the presenter calls, so neither has to know the
 * other exists.
 *
 * Presentation-only: the canonical feed is untouched, so the statements and the
 * trial balance never see any of it.
 */
import { payrollGroupKey, compoundLedgerRows } from './payrollGrouping'
import { creditGroupKey, compoundCreditRows } from './creditGrouping'
import type { LedgerEntry } from './ledgerEntry'
import type { LedgerRow } from './ledgerPresenter'

/** How a group renders once it holds more than one entry. */
type Compound = (
  group: readonly LedgerEntry[],
  rowsOf: (e: LedgerEntry) => LedgerRow[]
) => LedgerRow[]

const RENDERERS: Record<string, Compound> = {
  payroll: compoundLedgerRows,
  credit: compoundCreditRows
}

/** The group an entry belongs to, or `null` when it always stands alone. */
function groupOf(entry: LedgerEntry): { key: string; kind: string } | null {
  const payroll = payrollGroupKey(entry)
  if (payroll) return { key: `payroll:${payroll}`, kind: 'payroll' }
  const credit = creditGroupKey(entry)
  return credit ? { key: `credit:${credit}`, kind: 'credit' } : null
}

/**
 * Partition entries into render groups, preserving feed order: a grouped event's
 * legs cluster at the first leg's position; every other entry is its own singleton.
 */
function groupLedgerEntries(entries: readonly LedgerEntry[]): Array<{
  kind: string
  entries: LedgerEntry[]
}> {
  const order: string[] = []
  const groups = new Map<string, { kind: string; entries: LedgerEntry[] }>()
  entries.forEach((entry, i) => {
    const found = groupOf(entry)
    const key = found?.key ?? `solo:${i}`
    const bucket = groups.get(key)
    if (bucket) bucket.entries.push(entry)
    else {
      groups.set(key, { kind: found?.kind ?? 'solo', entries: [entry] })
      order.push(key)
    }
  })
  return order.map((key) => groups.get(key)!)
}

/**
 * Flatten a feed into ledger rows, folding each group into one compound posting
 * and leaving every other entry as its plain two-row posting. The single entry
 * point the presenter's `ledgerRows` delegates to.
 */
export function flattenLedgerRows(
  entries: readonly LedgerEntry[],
  rowsOf: (entry: LedgerEntry) => LedgerRow[]
): LedgerRow[] {
  return groupLedgerEntries(entries).flatMap((group) => {
    const render = RENDERERS[group.kind]
    return group.entries.length > 1 && render
      ? render(group.entries, rowsOf)
      : group.entries.flatMap(rowsOf)
  })
}
