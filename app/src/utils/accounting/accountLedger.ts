import { filterByPeriod, money, dayLabel, periodLabel } from './presenter'
import { netBalanceByAccount } from './generalLedger'
import { ledgerRows, type LedgerRow, type LedgerView } from './ledgerPresenter'
import { mergeBankFees } from './mergeBankFees'
import { buildPocketInstances } from './pocketInstances'
import { isDebitNormal } from './chartOfAccounts'
import type { LedgerEntry } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'

/**
 * One account's postings over a window, **oldest first** — the reading order of
 * a general ledger: the opening balance heads the page, each posting moves it,
 * and the closing balance lands at the foot.
 */
/**
 * Scope a drill-down to a single pocket **instance** (a redeployed Bank / Payroll /
 * Expense). `instance` is the contract address the trial-balance row rolls up; only
 * postings whose matching leg carries that address are kept. `includeBlank` adds the
 * legs that carry no address at all (a FixedReturn sweep straight to Bank, an owner
 * treasury sweep) — folded into the pocket's primary instance in the trial balance,
 * so the primary row's drill-down must show them too. Unset for a non-split account.
 */
export interface InstanceScope {
  instance?: string | null
  includeBlank?: boolean
}

/** Whether an entry touches `account` on a leg that matches the instance scope. */
function touchesAccount(
  entry: LedgerEntry,
  wanted: ReadonlySet<string>,
  scope?: InstanceScope
): boolean {
  const inst = scope?.instance?.toLowerCase()
  const legMatches = (leg: string | null, legInstance?: string): boolean => {
    if (!wanted.has(leg ?? '')) return false
    if (!inst) return true
    if (legInstance && legInstance.toLowerCase() === inst) return true
    return Boolean(scope?.includeBlank) && !legInstance
  }
  return (
    legMatches(entry.debit, entry.debitInstance) || legMatches(entry.credit, entry.creditInstance)
  )
}

export function entriesForAccount(
  entries: readonly LedgerEntry[],
  account: string | readonly string[],
  from?: Date | null,
  to?: Date | null,
  scope?: InstanceScope
): LedgerEntry[] {
  const wanted = new Set(typeof account === 'string' ? [account] : account)
  return filterByPeriod(entries, from, to)
    .filter((entry) => touchesAccount(entry, wanted, scope))
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
}

/** The net balance (natural, non-negative side) of an account over its postings. */
export function accountNet(entries: readonly LedgerEntry[], account: string): number {
  return netBalanceByAccount(entries).get(account as AccountName) ?? 0
}

/** The net balance (natural, non-negative side) of an account over its postings, as USD. */
export function accountBalance(entries: readonly LedgerEntry[], account: string): string {
  return money(accountNet(entries, account))
}

/** A rendered `$` cell back as a number; a blank cell moved nothing. */
function amountOf(cell: string): number {
  return cell ? Number(cell.replace(/[$,]/g, '')) : 0
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const BANK_ACCOUNT = 'Cash — Bank'

/**
 * Whether a leg's contract instance falls within a drill-down's instance scope —
 * the same rule {@link touchesAccount} filters entries by. An unset scope (or one
 * with no instance) matches every leg (a non-split account); otherwise the leg's
 * own instance must match, or be blank when the scope folds the un-instanced legs
 * in ({@link InstanceScope.includeBlank}).
 */
function legInScope(instance: string | undefined, scope?: InstanceScope): boolean {
  const inst = scope?.instance?.toLowerCase()
  if (!inst) return true
  if (instance && instance.toLowerCase() === inst) return true
  return Boolean(scope?.includeBlank) && !instance
}

/**
 * One entry's signed movement of `account` **within the instance scope**, on the
 * account's natural side. Unlike {@link netBalanceByAccount}, which keys on the
 * account name alone, this counts only the legs whose contract instance is in
 * scope — so a redeployed pocket's own line reconciles even when a single posting
 * touches the account on two different deployments (a Bank → Bank treasury move
 * credits one Bank and debits another, both `Cash — Bank`). A folded Bank fee
 * ({@link ./mergeBankFees}) rides on its transfer's Bank credit leg, so it counts
 * on that same instance.
 */
function scopedMovement(entry: LedgerEntry, account: string, scope?: InstanceScope): number {
  let signed = 0
  if (entry.debit === account && legInScope(entry.debitInstance, scope)) signed += entry.amountUsd
  if (entry.credit === account && legInScope(entry.creditInstance, scope)) signed -= entry.amountUsd
  const fee = entry.mergedBankFee
  if (
    fee &&
    account === BANK_ACCOUNT &&
    entry.credit === BANK_ACCOUNT &&
    legInScope(entry.creditInstance, scope)
  ) {
    signed -= fee.amountUsd
  }
  return isDebitNormal(account as AccountName) ? signed : -signed
}

/**
 * The net balance of `account` over its postings, scoped to one pocket instance
 * (natural side). The drill-down equivalent of {@link accountNet}: it reconciles a
 * split pocket's line, and reads a merged Bank fee off its transfer.
 */
export function scopedNet(
  entries: readonly LedgerEntry[],
  account: string,
  scope?: InstanceScope
): number {
  return round2(entries.reduce((sum, entry) => sum + scopedMovement(entry, account, scope), 0))
}

/**
 * Annotate one account's ledger rows with a **running balance** — what the
 * account stands at once each posting is booked.
 *
 * Rows read oldest-first, so the walk opens on `startingBalance` (the balance
 * carried into the first row) and adds each posting's own movement on the way
 * down, from the very figures the Debit / Credit columns show. Only the rows
 * carrying the account's own leg — on the scoped instance — move it: the facing
 * leg, and a leg on another deployment, stay blank.
 */
export function withRunningBalance(
  rows: readonly LedgerRow[],
  account: string,
  startingBalance: number,
  scope?: InstanceScope
): LedgerRow[] {
  const debitNormal = isDebitNormal(account as AccountName)
  let balance = startingBalance
  return rows.map((row) => {
    if (row.account !== account || !legInScope(row.accountInstance, scope)) return row
    const movement = amountOf(row.dr) - amountOf(row.cr)
    balance = round2(balance + (debitNormal ? movement : -movement))
    return { ...row, balance: money(balance) }
  })
}

/** What an account carries into a reporting window: prior movements and balance. */
export interface AccountOpening {
  /** Σ of the debit legs booked before the window. */
  debits: number
  /** Σ of the credit legs booked before the window. */
  credits: number
  /** The balance those movements leave, on the account's natural side. */
  balance: number
}

/** Nothing carried in — an open-ended window, or a line with no single account. */
export const NO_OPENING: AccountOpening = { debits: 0, credits: 0, balance: 0 }

/**
 * What `account` carries into a window opening at `from`: everything booked
 * strictly before it. An open-ended window (no `from`) opens the book itself, so
 * nothing precedes it.
 */
export function accountOpening(
  entries: readonly LedgerEntry[],
  account: string,
  from?: Date | null,
  scope?: InstanceScope
): AccountOpening {
  if (!from || !account) return NO_OPENING
  // `filterByPeriod` is inclusive, so cut one second short of the window.
  const prior = entriesForAccount(entries, account, null, new Date(from.getTime() - 1000), scope)
  let debits = 0
  let credits = 0
  // Count only the legs on the scoped instance, so a redeployed pocket's opening
  // brings forward its own deployment's movements, not the whole account's.
  for (const entry of prior) {
    if (entry.debit === account && legInScope(entry.debitInstance, scope)) debits += entry.amountUsd
    if (entry.credit === account && legInScope(entry.creditInstance, scope)) {
      credits += entry.amountUsd
    }
  }
  return {
    debits: round2(debits),
    credits: round2(credits),
    balance: scopedNet(prior, account, scope)
  }
}

/**
 * The "Opening balance" line that heads an account's ledger — the balance
 * brought forward, with the movements behind it. Not a posting: it carries no
 * date, action or activity.
 */
export function openingRow(opening: AccountOpening): LedgerRow {
  return {
    isFirst: true,
    date: '',
    label: 'Opening balance',
    activity: { kind: 'plain', text: '' },
    category: '',
    categoryClass: '',
    account: '',
    accountMuted: false,
    accountDimmed: false,
    dr: money(opening.debits),
    cr: money(opening.credits),
    currency: '',
    quantity: '',
    rate: '',
    balance: money(opening.balance)
  }
}

export function presentAccountLedger(
  entries: readonly LedgerEntry[],
  account: string | readonly string[],
  from?: Date | null,
  to?: Date | null,
  total?: string,
  scope?: InstanceScope
): LedgerView {
  const scoped = entriesForAccount(entries, account, from, to, scope)
  // Fold each Bank fee into its transfer for display, as the general ledger does,
  // so a transfer-plus-fee reads as one compound entry rather than two rows. The
  // total stays on the un-merged slice, whose net is unchanged by the fold.
  const display = mergeBankFees(scoped)
  return {
    // Deployments are numbered off the whole book, not the drilled slice, so a
    // redeployed pocket reads under the same number the trial balance gave it.
    rows: ledgerRows(display, buildPocketInstances(entries)),
    // Net the scoped slice on its own instance so a redeployed pocket's line
    // reconciles; an aggregate (a list of accounts) keeps the caller's figure.
    total:
      total ?? (typeof account === 'string' ? money(scopedNet(scoped, account, scope)) : money(0)),
    entryCount: display.length
  }
}

export function accountLedgerTitle(account: string, from?: Date | null, to?: Date | null): string {
  const base = `General Ledger — ${account}`
  if (from) return `${base} — ${periodLabel(from, to)}`
  return to ? `${base} — As of ${dayLabel(to)}` : base
}
