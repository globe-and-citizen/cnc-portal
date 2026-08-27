import { filterByPeriod, money, dayLabel, periodLabel } from './presenter'
import { netBalanceByAccount } from './generalLedger'
import { ledgerRows, type LedgerRow, type LedgerView } from './ledgerPresenter'
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
    .filter((e) => touchesAccount(e, wanted, scope))
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

/**
 * Annotate one account's ledger rows with a **running balance** — what the
 * account stands at once each posting is booked.
 *
 * Rows read oldest-first, so the walk opens on `startingBalance` (the balance
 * carried into the first row) and adds each posting's own movement on the way
 * down, from the very figures the Debit / Credit columns show. Only the rows
 * carrying the account's own leg move it: the facing leg stays blank.
 */
export function withRunningBalance(
  rows: readonly LedgerRow[],
  account: string,
  startingBalance: number
): LedgerRow[] {
  const debitNormal = isDebitNormal(account as AccountName)
  let balance = startingBalance
  return rows.map((row) => {
    if (row.account !== account) return row
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
  for (const entry of prior) {
    if (entry.debit === account) debits += entry.amountUsd
    if (entry.credit === account) credits += entry.amountUsd
  }
  return { debits: round2(debits), credits: round2(credits), balance: accountNet(prior, account) }
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
    cat: '',
    catClass: '',
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
  return {
    rows: ledgerRows(scoped),
    total: total ?? accountBalance(scoped, typeof account === 'string' ? account : ''),
    entryCount: scoped.length
  }
}

export function accountLedgerTitle(account: string, from?: Date | null, to?: Date | null): string {
  const base = `General Ledger — ${account}`
  if (from) return `${base} — ${periodLabel(from, to)}`
  return to ? `${base} — As of ${dayLabel(to)}` : base
}
