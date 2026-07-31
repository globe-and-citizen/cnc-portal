/**
 * General-ledger (journal) presentation — maps the consolidated {@link LedgerEntry}
 * feed into the rows the ledger table renders, with category badges and a
 * category/date filter. Split from {@link ./presenter} (which handles the
 * statement-level views) to keep each module focused. Pure and unit-testable.
 */
import { money, fmtDateTime, filterByPeriod, periodLabel, currencySymbol } from './presenter'
import { wholeTokenAmount } from './toUsd'
import { activityOf, entryLabel, type ActivityCell } from './describeEntry'
import { mergeBankFees } from './mergeBankFees'
import { flattenLedgerRows } from './ledgerGrouping'
import { filterLedgerByCurrency } from './ledgerCurrency'
import { formatAmountWithPrecision } from '@/utils/currencyUtil'
import {
  badgeClassOf,
  categoryOf,
  FEE_ACCOUNT,
  FEE_FILTER,
  type LedgerCategory
} from './ledgerCategory'
import type { LedgerEntry } from './ledgerEntry'
import type { TokenId } from '@/constant'

// Currency derivation / filtering lives in its own module, re-exported here.
export { entryCurrency, ledgerCurrencies, filterLedgerByCurrency } from './ledgerCurrency'
// So do the category vocabulary and its badges — see ./ledgerCategory.
export {
  badgeClassOf,
  categoryOf,
  CATEGORY_BADGE,
  FEE_ACCOUNT,
  FEE_FILTER,
  ledgerCategories,
  type LedgerCategory
} from './ledgerCategory'

// So does the column list the table, the selector and the exporters share.
export { LEDGER_COLUMNS, resolveLedgerColumns, ledgerTotalRow } from './ledgerColumns'
export type { LedgerColumn, LedgerColumnKey } from './ledgerColumns'

/** The empty activity carried by a posting's continuation (credit) and total rows. */
const NO_ACTIVITY: ActivityCell = { kind: 'plain', text: '' }

export interface LedgerRow {
  isFirst: boolean
  date: string
  /** The generic accounting-entry label (the "Transaction" column), e.g. "Wage accrual". */
  label: string
  /** The structured narration (the "Activity" column) — avatar(s) + predicate. */
  activity: ActivityCell
  cat: LedgerCategory | ''
  catClass: string
  account: string
  accountMuted: boolean
  accountDimmed: boolean
  dr: string
  cr: string
  /** The posting's currency (spec §2 "Devise"), e.g. `POL` / `USDC`. */
  currency: string
  /** Whole-token quantity moved (spec §2 "Quantité"), 6-dp, e.g. `0.070352`. */
  quantity: string
  /** USD rate of record (spec §2 "Taux"), up to 6-dp with trailing zeros trimmed, e.g. `$0.08` / `$1`. */
  rate: string
  /** True on a `Transaction Fee Expense` leg — drives the "Fee" badge and filter. */
  isFee?: boolean
  /** Running balance of the drilled account after this posting (see
   *  {@link ./accountLedger.withRunningBalance}); absent outside a drill-down. */
  balance?: string
}

export interface LedgerView {
  rows: LedgerRow[]
  total: string
  entryCount: number
}

/** The Devise / Quantité / Taux columns of one token move (spec §2). */
type Movement = Pick<LedgerRow, 'currency' | 'quantity' | 'rate'>

/** Carried by the continuation rows of a posting, which repeat no movement. */
const NO_MOVEMENT: Movement = { currency: '', quantity: '', rate: '' }

/** The movement columns of a token move; a malformed raw amount reads as 0. */
function movementOf(rawAmount: string, token: TokenId, rate?: number): Movement {
  let whole = 0
  try {
    whole = wholeTokenAmount(BigInt(rawAmount), token)
  } catch {
    // malformed raw amount → keep 0
  }
  return {
    currency: currencySymbol(token),
    quantity: whole.toLocaleString('en-US', { maximumFractionDigits: 6 }),
    // Reuse the shared amount formatter (as Bank / Payroll do) so trailing zeros
    // are trimmed — `1.000000` reads `1`, `0.200000` reads `0.2` — while a value
    // with real decimals keeps them, capped at 6 dp.
    rate: rate == null ? '' : '$' + formatAmountWithPrecision(rate, 0, 6)
  }
}

/** A posting's second and later lines — the lead row alone carries date / action / activity. */
function continuationRow(
  account: string,
  amounts: { dr?: string; cr?: string; accountMuted?: boolean; isFee?: boolean },
  movement: Movement = NO_MOVEMENT
): LedgerRow {
  return {
    isFirst: false,
    date: '',
    label: '',
    activity: NO_ACTIVITY,
    cat: '',
    catClass: '',
    account,
    accountMuted: amounts.accountMuted ?? false,
    accountDimmed: false,
    dr: amounts.dr ?? '',
    cr: amounts.cr ?? '',
    isFee: amounts.isFee ?? false,
    ...movement
  }
}

/** The journal-line rows (debit then credit) a posting renders as. */
function rowsOf(entry: LedgerEntry): LedgerRow[] {
  const head = {
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: activityOf(entry),
    cat: categoryOf(entry),
    catClass: badgeClassOf(entry)
  }
  // The same token move backs every leg, so the movement columns show once, on the
  // lead row — except the fee leg below, which is its own (smaller) move.
  const movement = movementOf(entry.rawAmount, entry.token, entry.rate)

  // Memo-only posting (no monetary legs): a single dimmed share-count line.
  if (!entry.debit && !entry.credit) {
    return [
      {
        ...head,
        ...NO_MOVEMENT,
        account: entry.shares ? `+${entry.shares} SHER (memo)` : 'Memo',
        accountMuted: false,
        accountDimmed: true,
        dr: '',
        cr: ''
      }
    ]
  }

  // A transfer with a fee skimmed in the same transaction ({@link mergeBankFees})
  // renders as one compound entry: Dr destination (net) · Dr Transaction Fee
  // Expense · Cr Cash — Bank (gross), rather than two separate postings.
  const fee = entry.mergedBankFee
  if (fee && entry.debit && entry.credit) {
    return [
      {
        ...head,
        ...movement,
        account: entry.debit,
        accountMuted: false,
        accountDimmed: false,
        dr: money(entry.amountUsd),
        cr: ''
      },
      continuationRow(
        FEE_ACCOUNT,
        { dr: money(fee.amountUsd), isFee: true },
        movementOf(fee.rawAmount, fee.token, fee.rate)
      ),
      continuationRow(entry.credit, {
        cr: money(entry.amountUsd + fee.amountUsd),
        accountMuted: true
      })
    ]
  }

  const rows: LedgerRow[] = []
  if (entry.debit) {
    rows.push({
      ...head,
      ...movement,
      account: entry.debit,
      accountMuted: false,
      accountDimmed: false,
      dr: money(entry.amountUsd),
      cr: '',
      isFee: entry.debit === FEE_ACCOUNT
    })
  }
  if (entry.credit) {
    rows.push(
      rows.length
        ? continuationRow(entry.credit, { cr: money(entry.amountUsd), accountMuted: true })
        : {
            ...head,
            ...movement,
            account: entry.credit,
            accountMuted: true,
            accountDimmed: false,
            dr: '',
            cr: money(entry.amountUsd)
          }
    )
  }
  return rows
}

/**
 * The ledger entries narrowed by category + inclusive date window (+ an optional
 * currency selection), sorted chronologically, with each Bank fee folded into its
 * transfer ({@link mergeBankFees}). Split out so a paginated view can slice by
 * **entry** (not by row — a posting spans two-plus rows) before flattening into
 * table rows.
 */
export function filterLedgerEntries(
  entries: readonly LedgerEntry[],
  filter: string,
  from?: Date | null,
  to?: Date | null,
  currencies?: readonly string[] | null
): LedgerEntry[] {
  const shown = filterByPeriod(entries, from, to)
    .filter((e) => filter === 'All' || filter === FEE_FILTER || categoryOf(e) === filter)
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp) // most recent first
  const merged = mergeBankFees(shown)
  const scoped = filter === FEE_FILTER ? merged.filter(entryHasFee) : merged
  return currencies ? filterLedgerByCurrency(scoped, currencies, filter === FEE_FILTER) : scoped
}

/** Flatten postings into rows, folding a wage event's per-currency legs and a
 *  credit round's per-lender legs into one compound posting each
 *  ({@link ./ledgerGrouping}); every other entry stays two rows. */
export function ledgerRows(entries: readonly LedgerEntry[]): LedgerRow[] {
  return flattenLedgerRows(entries, rowsOf)
}

/** True when an entry carries a {@link FEE_ACCOUNT} leg (folded or standalone). */
export function entryHasFee(entry: LedgerEntry): boolean {
  return entry.mergedBankFee != null || entry.debit === FEE_ACCOUNT
}

/**
 * One contextual line per fee-bearing entry — just the single isFee leg rowsOf
 * emits (its own amount + movement), promoted to a lead row so the isolated line
 * keeps its date / activity (a folded fee's leg is a blank continuation).
 */
export function ledgerFeeRows(entries: readonly LedgerEntry[]): LedgerRow[] {
  return entries.filter(entryHasFee).map((entry) => ({
    ...(rowsOf(entry).find((r) => r.isFee) as LedgerRow),
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: activityOf(entry)
  }))
}

/**
 * Σ of the fee legs across the fee-bearing entries, formatted as USD — each
 * leg's amount is the folded fee, else the standalone fee posting itself.
 */
export function ledgerFeeTotal(entries: readonly LedgerEntry[]): string {
  const legUsd = (e: LedgerEntry) => e.mergedBankFee?.amountUsd ?? e.amountUsd
  return money(entries.filter(entryHasFee).reduce((sum, e) => sum + legUsd(e), 0))
}

/**
 * Σ of the debit legs — the "Total movements" figure, formatted as USD. A folded
 * Bank fee ({@link mergeBankFees}) is an extra debit leg on its transfer, so its
 * amount is added in too (the standalone fee posting it replaced is gone).
 */
export function ledgerTotal(entries: readonly LedgerEntry[]): string {
  return money(
    entries.reduce(
      (sum, e) => sum + (e.debit ? e.amountUsd : 0) + (e.mergedBankFee?.amountUsd ?? 0),
      0
    )
  )
}

/** General-ledger rows narrowed by category + inclusive date window (+ currency). */
export function presentLedger(
  entries: readonly LedgerEntry[],
  filter: string,
  from?: Date | null,
  to?: Date | null,
  currencies?: readonly string[] | null
): LedgerView {
  const shown = filterLedgerEntries(entries, filter, from, to, currencies)
  const rows = filter === FEE_FILTER ? ledgerFeeRows(shown) : ledgerRows(shown)
  const total = filter === FEE_FILTER ? ledgerFeeTotal(shown) : ledgerTotal(shown)
  return { rows, total, entryCount: shown.length }
}

/**
 * The heading a ledger export prints, spelling out the active scope so the file
 * is self-describing: the category (when narrowed from "All") and the reporting
 * period (when a date range is set). Plain `"General Ledger"` for the whole book.
 */
export function ledgerExportTitle(filter?: string, from?: Date | null, to?: Date | null): string {
  const parts = ['General Ledger']
  if (filter && filter !== 'All') parts.push(filter)
  if (from || to) parts.push(periodLabel(from, to))
  return parts.join(' — ')
}
