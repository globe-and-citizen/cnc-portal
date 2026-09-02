/**
 * General-ledger (journal) presentation — maps the consolidated {@link LedgerEntry}
 * feed into the rows the ledger table renders, with category badges and a
 * category/date filter. Split from {@link ./presenter} (which handles the
 * statement-level views) to keep each module focused. Pure and unit-testable.
 */
import { money, fmtDateTime, filterByPeriod, periodLabel, currencySymbol } from './presenter'
import { wholeTokenAmount } from './toUsd'
import { activityOf, entryLabel, type ActivityCell } from './describeEntry'
import { activityDestinationOf, type ActivityDestination } from './activityDestination'
import { mergeBankFees } from './mergeBankFees'
import { flattenLedgerRows } from './ledgerGrouping'
import { filterLedgerByCurrency } from './ledgerCurrency'
import { buildPocketInstances, NO_POCKET_INSTANCES } from './pocketInstances'
import {
  badgeClassOf,
  categoryOf,
  categoryLabelOf,
  FEE_ACCOUNT,
  FEE_FILTER
} from './ledgerCategory'
import type { PocketInstanceIndex } from './pocketInstances'
import type { LedgerEntry } from './ledgerEntry'
import type { TokenId } from '@/constant'
import { formatNumber } from '@/utils/format'

// Currency derivation / filtering lives in its own module, re-exported here.
export { entryCurrency, ledgerCurrencies, filterLedgerByCurrency } from './ledgerCurrency'
// So is the Activity's link target — see ./activityDestination.
export { activityDestinationOf } from './activityDestination'
export type { ActivityDestination, LedgerSection } from './activityDestination'
// So do the category vocabulary and its badges — see ./ledgerCategory.
export {
  badgeClassOf,
  categoryOf,
  categoryLabelOf,
  CATEGORY_BADGE,
  FEE_ACCOUNT,
  FEE_FILTER,
  ledgerCategories,
  type LedgerCategory
} from './ledgerCategory'

// So does the pocket-deployment numbering a redeployed account reads under.
export { buildPocketInstances, NO_POCKET_INSTANCES } from './pocketInstances'
export type { PocketInstance, PocketInstanceIndex } from './pocketInstances'

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
  /** The section the Activity links to ({@link ./activityDestination}); absent on
   *  a continuation row, and on a posting with no portal surface of its own. */
  destination?: ActivityDestination | null
  /** The "Action" badge text — {@link categoryLabelOf} (a plain category, or a
   *  spelled-out payroll phase); empty on a posting's continuation rows. */
  cat: string
  catClass: string
  account: string
  /** Display name for the account — `Cash — Bank 2` on a redeployed pocket's later
   *  deployment ({@link ./pocketInstances}), else exactly {@link account}. Absent
   *  when the account never split, so a normal book reads as before. */
  accountLabel?: string
  /** The pocket contract this leg's cash sits in — set only on a redeployed account. */
  accountInstance?: string
  /** 1-based deployment number of {@link accountInstance} (1 = the original). */
  instanceNumber?: number
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

/** The empty account leg placeholder — a memo posting carries no real account. */
const NO_ACCOUNT = ''

/**
 * The distinct real accounts a set of postings touches (either leg), A–Z. Backs
 * the ledger's account filter. Memo postings carry no leg, so contribute nothing.
 *
 * When a deployment index is given, a redeployed cash pocket is listed once per
 * deployment under its numbered label (`Cash — Bank` / `Cash — Bank 2`), so the
 * filter can isolate a single deployment; every other account reads under its
 * plain name. Without an index every account reads plain, exactly as before.
 * Numeric-aware sort keeps `Cash — Bank 2` before `Cash — Bank 10`.
 */
export function ledgerAccounts(
  entries: readonly LedgerEntry[],
  instances: PocketInstanceIndex = NO_POCKET_INSTANCES
): string[] {
  const seen = new Set<string>()
  for (const entry of entries) {
    if (entry.debit) seen.add(instances.labelOf(entry.debit, entry.debitInstance))
    if (entry.credit) seen.add(instances.labelOf(entry.credit, entry.creditInstance))
  }
  seen.delete(NO_ACCOUNT)
  return [...seen].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}

/**
 * Narrow the feed to the postings that touch **any** of `accounts` on either leg —
 * whole entries, so a kept posting always shows both its debit and its credit row.
 *
 * The names are matched against each leg's display label, so passing a numbered
 * deployment label (`Cash — Bank 2`) keeps only that deployment's postings; a
 * plain account name behaves exactly as before. The index must be the same one
 * {@link ledgerAccounts} produced the options from.
 */
export function filterLedgerByAccount(
  entries: readonly LedgerEntry[],
  accounts: readonly string[],
  instances: PocketInstanceIndex = NO_POCKET_INSTANCES
): LedgerEntry[] {
  const wanted = new Set(accounts)
  return entries.filter(
    (e) =>
      wanted.has(instances.labelOf(e.debit, e.debitInstance)) ||
      wanted.has(instances.labelOf(e.credit, e.creditInstance))
  )
}

/** The account fields of one journal line: its name, and which deployment it moved. */
type LegAccount = Pick<LedgerRow, 'account' | 'accountLabel' | 'accountInstance' | 'instanceNumber'>

/**
 * One leg's account fields — plain for a normal account, carrying the deployment's
 * numbered label when the pocket was redeployed, so the journal says which contract
 * moved without changing what the account **is** (the filters and the account jump
 * keep reading {@link LedgerRow.account}).
 */
function legAccount(
  account: string,
  instance: string | undefined,
  instances: PocketInstanceIndex
): LegAccount {
  const found = instances.instanceOf(account, instance)
  return found
    ? {
        account,
        accountLabel: found.label,
        accountInstance: found.instance,
        instanceNumber: found.number
      }
    : { account }
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
    quantity: formatNumber(whole, { maxDecimals: 6 }),
    // Rates remain compact while preserving real fractional precision up to 6 dp.
    rate: rate == null ? '' : `$${formatNumber(rate, { maxDecimals: 6 })}`
  }
}

/** A posting's second and later lines — the lead row alone carries date / action / activity. */
function continuationRow(
  leg: LegAccount,
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
    ...leg,
    accountMuted: amounts.accountMuted ?? false,
    accountDimmed: false,
    dr: amounts.dr ?? '',
    cr: amounts.cr ?? '',
    isFee: amounts.isFee ?? false,
    ...movement
  }
}

/** The journal-line rows (debit then credit) a posting renders as. */
function rowsOf(entry: LedgerEntry, instances: PocketInstanceIndex): LedgerRow[] {
  const head = {
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: activityOf(entry),
    destination: activityDestinationOf(entry),
    cat: categoryLabelOf(entry),
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
        ...legAccount(entry.debit, entry.debitInstance, instances),
        accountMuted: false,
        accountDimmed: false,
        dr: money(entry.amountUsd),
        cr: ''
      },
      continuationRow(
        { account: FEE_ACCOUNT },
        { dr: money(fee.amountUsd), isFee: true },
        movementOf(fee.rawAmount, fee.token, fee.rate)
      ),
      continuationRow(legAccount(entry.credit, entry.creditInstance, instances), {
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
      ...legAccount(entry.debit, entry.debitInstance, instances),
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
        ? continuationRow(legAccount(entry.credit, entry.creditInstance, instances), {
            cr: money(entry.amountUsd),
            accountMuted: true
          })
        : {
            ...head,
            ...movement,
            ...legAccount(entry.credit, entry.creditInstance, instances),
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
export function ledgerRows(
  entries: readonly LedgerEntry[],
  instances: PocketInstanceIndex = NO_POCKET_INSTANCES
): LedgerRow[] {
  return flattenLedgerRows(entries, (entry) => rowsOf(entry, instances))
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
export function ledgerFeeRows(
  entries: readonly LedgerEntry[],
  instances: PocketInstanceIndex = NO_POCKET_INSTANCES
): LedgerRow[] {
  return entries.filter(entryHasFee).map((entry) => ({
    ...(rowsOf(entry, instances).find((r) => r.isFee) as LedgerRow),
    isFirst: true,
    date: fmtDateTime(entry.timestamp),
    label: entryLabel(entry),
    activity: activityOf(entry),
    destination: activityDestinationOf(entry)
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
  // Numbered off the **whole** feed, not the filtered slice, so a deployment keeps
  // the same number whatever the active filter.
  const instances = buildPocketInstances(entries)
  const rows =
    filter === FEE_FILTER ? ledgerFeeRows(shown, instances) : ledgerRows(shown, instances)
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
