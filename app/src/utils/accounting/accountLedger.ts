import { filterByPeriod, money, dayLabel, periodLabel } from './presenter'
import { netBalanceByAccount } from './generalLedger'
import { ledgerRows, type LedgerView } from './ledgerPresenter'
import type { LedgerEntry } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'

export function entriesForAccount(
  entries: readonly LedgerEntry[],
  account: string | readonly string[],
  from?: Date | null,
  to?: Date | null
): LedgerEntry[] {
  const wanted = new Set(typeof account === 'string' ? [account] : account)
  return filterByPeriod(entries, from, to)
    .filter((e) => wanted.has(e.debit ?? '') || wanted.has(e.credit ?? ''))
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp)
}

/** The net balance (natural, non-negative side) of an account over its postings, as USD. */
export function accountBalance(entries: readonly LedgerEntry[], account: string): string {
  return money(netBalanceByAccount(entries).get(account as AccountName) ?? 0)
}

export function presentAccountLedger(
  entries: readonly LedgerEntry[],
  account: string | readonly string[],
  from?: Date | null,
  to?: Date | null,
  total?: string
): LedgerView {
  const scoped = entriesForAccount(entries, account, from, to)
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
