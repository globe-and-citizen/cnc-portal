/**
 *
 * The magnifying glass beside a statement line opens the General Ledger entries
 * that compose that line's balance. This module is the pure core behind it: pick
 * the postings whose debit or credit leg touches an account (up to an "as of"
 * date), and reduce them to the same {@link LedgerView} the main ledger renders —
 * so the popup, and the account-scoped PDF / Excel export, reconcile the line.
 *
 * Split from {@link ./ledgerPresenter} to keep that module under its line budget
 * and to depend on {@link ./generalLedger} without bloating the presenter.
 */
import { filterByPeriod, money, dayLabel } from './presenter'
import { netBalanceByAccount } from './generalLedger'
import { ledgerRows, type LedgerView } from './ledgerPresenter'
import type { LedgerEntry } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'

/**
 * The postings composing an account's balance — every entry whose debit or
 * credit leg touches `account`, up to `asOf`, newest first (as the ledger view).
 */
export function entriesForAccount(
  entries: readonly LedgerEntry[],
  account: string,
  asOf?: Date | null
): LedgerEntry[] {
  return filterByPeriod(entries, null, asOf)
    .filter((e) => e.debit === account || e.credit === account)
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
}

/** The net balance (natural, non-negative side) of an account over its postings, as USD. */
export function accountBalance(entries: readonly LedgerEntry[], account: string): string {
  return money(netBalanceByAccount(entries).get(account as AccountName) ?? 0)
}

/**
 * The ledger view for a single account's drill-down: the flattened rows, the
 * account's balance as the `total` (the exact figure the statement line shows,
 * so the popup reconciles it), and the entry count for pagination.
 */
export function presentAccountLedger(
  entries: readonly LedgerEntry[],
  account: string,
  asOf?: Date | null
): LedgerView {
  const scoped = entriesForAccount(entries, account, asOf)
  return {
    rows: ledgerRows(scoped),
    total: accountBalance(scoped, account),
    entryCount: scoped.length
  }
}

/** In-file heading for an account drill-down export — names the account and its as-of date. */
export function accountLedgerTitle(account: string, asOf?: Date | null): string {
  const base = `General Ledger — ${account}`
  return asOf ? `${base} — As of ${dayLabel(asOf)}` : base
}
