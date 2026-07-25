/**
 * General-ledger presentation transform: fold the per-currency legs of one wage
 * event into a **single compound posting**, so a salary paid across USDC / POL /
 * SHER reads as one entry (one Date / Action / Transaction / Activity head) with
 * one debit line per token and one aggregated credit line — instead of one whole
 * posting repeated per rate.
 *
 * A weekly claim books one balanced pair per rate (see `mappers/payrollAccrual.ts`
 * and `mappers/cashRemuneration.ts`). Grouping keys:
 *   - accrual  (`UC-CASH-02`): the claim — same member (`counterparty`) + week-end
 *     `timestamp` (accrual is off-chain, so it carries no txHash).
 *   - settlement (`UC-CASH-03` cash/share legs, and the `DEFAULT-D` share issuance
 *     minted inside the same withdraw): the on-chain transaction hash. A standalone
 *     direct mint (not a wage) has no `UC-CASH-03` sibling on its txHash, so it
 *     forms a singleton group and renders unchanged.
 *
 * Presentation-only: the canonical entries (and the statements they feed) are
 * untouched — this only changes how rows are flattened for the table. Mirrors the
 * approach of {@link ./mergeBankFees}.
 */
import { money } from './presenter'
import { txHashOf } from './mergeBankFees'
import { withSherTail } from './describeEntry'
import type { LedgerEntry } from './ledgerEntry'
import type { LedgerRow } from './ledgerPresenter'

/** The empty activity carried by a compound posting's continuation rows. */
const NO_ACTIVITY: LedgerRow['activity'] = { kind: 'plain', text: '' }

/**
 * Entries that fold into one compound posting share this key; `null` for entries
 * that always stand alone (everything non-payroll).
 */
function payrollGroupKey(entry: LedgerEntry): string | null {
  switch (entry.useCase) {
    case 'UC-CASH-02':
      return `accrual|${entry.counterparty ?? ''}|${entry.timestamp}`
    case 'UC-CASH-03':
    case 'DEFAULT-D':
      return `settle|${txHashOf(entry)}`
    default:
      return null
  }
}

/**
 * Partition entries into render groups, preserving feed order: a payroll event's
 * legs cluster at the first leg's position; every other entry is its own singleton.
 */
export function groupPayrollEntries(entries: readonly LedgerEntry[]): LedgerEntry[][] {
  const order: string[] = []
  const groups = new Map<string, LedgerEntry[]>()
  entries.forEach((entry, i) => {
    const key = payrollGroupKey(entry) ?? `solo:${i}`
    const bucket = groups.get(key)
    if (bucket) bucket.push(entry)
    else {
      groups.set(key, [entry])
      order.push(key)
    }
  })
  return order.map((key) => groups.get(key)!)
}

/**
 * Flatten a feed into ledger rows, folding each payroll group into one compound
 * posting and leaving every other entry as its plain two-row posting. The single
 * entry point the presenter's `ledgerRows` delegates to.
 */
export function flattenLedgerRows(
  entries: readonly LedgerEntry[],
  rowsOf: (entry: LedgerEntry) => LedgerRow[]
): LedgerRow[] {
  return groupPayrollEntries(entries).flatMap((group) =>
    group.length > 1 ? compoundLedgerRows(group, rowsOf) : rowsOf(group[0]!)
  )
}

/** Sort rank so cash legs render before the SHER pair (the head reads as the wage). */
function sherRank(entry: LedgerEntry): number {
  return entry.token === 'sher' ? 1 : 0
}

/**
 * Render a multi-leg payroll group as one compound posting: within each
 * debit/credit account pair, one **itemized debit** row per token (keeping its
 * Devise / Quantité / Taux) then one **aggregated credit** row (Σ USD, no
 * movement). The lead row keeps the Date / Action / Transaction head with the
 * Activity enriched by the total SHER; all following rows render head-less.
 *
 * `rowsOf` is injected (rather than imported) so this module needs no runtime
 * dependency on the presenter — only its `LedgerRow` type.
 */
export function compoundLedgerRows(
  group: readonly LedgerEntry[],
  rowsOf: (entry: LedgerEntry) => LedgerRow[]
): LedgerRow[] {
  const order: string[] = []
  const pairs = new Map<string, LedgerEntry[]>()
  for (const entry of [...group].sort((a, b) => sherRank(a) - sherRank(b))) {
    const key = `${entry.debit}|${entry.credit}`
    const bucket = pairs.get(key)
    if (bucket) bucket.push(entry)
    else {
      pairs.set(key, [entry])
      order.push(key)
    }
  }

  const rows: LedgerRow[] = []
  for (const key of order) {
    const legs = pairs.get(key)!
    for (const entry of legs) {
      const [debitRow] = rowsOf(entry) // itemized debit (with movement)
      if (debitRow) rows.push(debitRow)
    }
    const creditRow = rowsOf(legs[0]!)[1]
    if (creditRow) {
      const sum = legs.reduce((total, entry) => total + entry.amountUsd, 0)
      rows.push({ ...creditRow, cr: money(sum) }) // one aggregated credit
    }
  }

  const sherShares = group.reduce(
    (total, entry) => total + (entry.token === 'sher' ? (entry.shares ?? 0) : 0),
    0
  )
  return rows.map((row, i) =>
    i === 0
      ? { ...row, activity: withSherTail(row.activity, sherShares) }
      : {
          ...row,
          isFirst: false,
          date: '',
          label: '',
          activity: NO_ACTIVITY,
          cat: '',
          catClass: ''
        }
  )
}
