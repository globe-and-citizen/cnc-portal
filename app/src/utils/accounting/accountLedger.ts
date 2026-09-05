import { dayLabel, filterByPeriod, money, periodLabel } from './presenter'
import type { Account } from './accountRegistry'
import { accountFamilyOf, type AccountName } from './chartOfAccounts'
import { creditOf, debitOf, type JournalEntry } from './journalEntry'
import type { LedgerRow } from './journalLedgerPresenter'

/**
 * A statement line selects a chart family; a Trial Balance line selects one
 * concrete account. Both select complete JournalEntry records, never raw source
 * postings or a contract-address side channel.
 */
export type AccountSelection = Account | AccountName | readonly AccountName[]

function isAggregateSelection(selection: AccountSelection): selection is readonly AccountName[] {
  return Array.isArray(selection)
}

function isConcreteAccount(selection: AccountSelection): selection is Account {
  return !isAggregateSelection(selection) && typeof selection !== 'string'
}

function lineMatchesSelection(
  line: JournalEntry['lines'][number],
  selection: AccountSelection
): boolean {
  if (isConcreteAccount(selection)) return line.account.id === selection.id
  const families = isAggregateSelection(selection) ? selection : [selection]
  return families.includes(line.account.family.name)
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Complete JournalEntry records that touch the selected account or account
 * family, in chronological order for a ledger reading.
 */
export function entriesForAccount(
  entries: readonly JournalEntry[],
  selection: AccountSelection,
  from?: Date | null,
  to?: Date | null
): JournalEntry[] {
  return filterByPeriod(entries, from, to)
    .filter((entry) => entry.lines.some((line) => lineMatchesSelection(line, selection)))
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id))
}

/** The debit and credit totals posted to one selected account or family. */
function accountMovements(
  entries: readonly JournalEntry[],
  selection: Exclude<AccountSelection, readonly AccountName[]>
): { debits: number; credits: number } {
  let debits = 0
  let credits = 0
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!lineMatchesSelection(line, selection)) continue
      debits += debitOf(line)
      credits += creditOf(line)
    }
  }
  return { debits: round2(debits), credits: round2(credits) }
}

/**
 * Net balance on the selected account family's normal side. Concrete accounts
 * retain their deployment identity through `Account.id`; family selections roll
 * over every deployment under the same chart family.
 */
export function accountNet(
  entries: readonly JournalEntry[],
  selection: Exclude<AccountSelection, readonly AccountName[]>
): number {
  const family = isConcreteAccount(selection) ? selection.family : accountFamilyOf(selection)
  if (!family) return 0
  const { debits, credits } = accountMovements(entries, selection)
  return round2(family.normalBalance === 'debit' ? debits - credits : credits - debits)
}

/** What an account carries into a reporting window: prior movements and balance. */
export interface AccountOpening {
  /** Sum of debit lines booked before the window. */
  debits: number
  /** Sum of credit lines booked before the window. */
  credits: number
  /** Balance on the selected account's normal side. */
  balance: number
}

/** Nothing carried in — an open-ended window, or an aggregate statement line. */
export const NO_OPENING: AccountOpening = { debits: 0, credits: 0, balance: 0 }

/**
 * What a concrete account or one account family carries into a window opening
 * at `from`. An aggregate can mix normal sides, so it intentionally has no
 * running balance.
 */
export function accountOpening(
  entries: readonly JournalEntry[],
  selection: Exclude<AccountSelection, readonly AccountName[]> | null,
  from?: Date | null
): AccountOpening {
  if (!from || !selection) return NO_OPENING
  const prior = entriesForAccount(entries, selection, null, new Date(from.getTime() - 1000))
  const { debits, credits } = accountMovements(prior, selection)
  return { debits, credits, balance: accountNet(prior, selection) }
}

/** The non-posting opening row that heads a drill-down ledger. */
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

function rowMatchesSelection(
  row: LedgerRow,
  selection: Exclude<AccountSelection, readonly AccountName[]>
): boolean {
  return isConcreteAccount(selection) ? row.accountId === selection.id : row.account === selection
}

/**
 * Annotate journal rows with the selected account's running balance. Every
 * JournalEntry remains intact in the table; only lines posted to the selected
 * account move the balance.
 */
export function withRunningBalance(
  rows: readonly LedgerRow[],
  selection: Exclude<AccountSelection, readonly AccountName[]>,
  startingBalance: number
): LedgerRow[] {
  const family = isConcreteAccount(selection) ? selection.family : accountFamilyOf(selection)
  if (!family) return [...rows]
  let balance = startingBalance
  return rows.map((row) => {
    if (!rowMatchesSelection(row, selection)) return row
    const debit = Number(row.dr.replace(/[$,]/g, '') || 0)
    const credit = Number(row.cr.replace(/[$,]/g, '') || 0)
    const movement = family.normalBalance === 'debit' ? debit - credit : credit - debit
    balance = round2(balance + movement)
    return { ...row, balance: money(balance) }
  })
}

export function accountLedgerTitle(account: string, from?: Date | null, to?: Date | null): string {
  const base = `General Ledger — ${account}`
  if (from) return `${base} — ${periodLabel(from, to)}`
  return to ? `${base} — As of ${dayLabel(to)}` : base
}
