/**
 * General Ledger projection of the canonical JournalEntry feed.
 *
 * Each filter selects whole journal entries, then this presenter flattens every
 * selected entry's debit and credit lines for the shared ledger table. A fee is
 * therefore an ordinary `Transaction Fee Expense` line within its source
 * operation, never a second transaction or a special filter category.
 */
import { formatNumber } from '@/utils/format'
import { activityDestinationOf } from './activityDestination'
import { activityOf, entryLabel, type ActivityCell } from './describeEntry'
import { badgeClassOf, categoryLabelOf } from './ledgerCategory'
import { currencySymbol, filterByPeriod, formatUnixDateTime, money, periodLabel } from './presenter'
import { wholeTokenAmount } from './toUsd'
import { creditOf, debitOf, type JournalEntry, type JournalEntryLine } from './journalEntry'
import type { Account } from './accountRegistry'
import type { LedgerEntry } from './ledgerEntry'
import type { LedgerRow } from './ledgerPresenter'

/** A concrete account offered by the General Ledger account filter. */
export interface JournalAccountFilterOption {
  value: string
  label: string
}

/** The empty activity carried by all but the first line of a journal entry. */
const NO_ACTIVITY: ActivityCell = { kind: 'plain', text: '' }
const NO_MOVEMENT = { currency: '', quantity: '', rate: '' }

/**
 * A primary source is recorded by assembly for narration. Hand-authored journal
 * entries in unit tests can omit it, so derive a safe display context from their
 * entry-level metadata and first debit / credit lines.
 */
function sourceOf(entry: JournalEntry): LedgerEntry {
  if (entry.source) return entry.source
  const debit = entry.lines.find((line) => line.debit !== undefined)
  const credit = entry.lines.find((line) => line.credit !== undefined)
  const movement = debit?.movement ?? credit?.movement
  return {
    id: entry.id,
    sourceOperationId: entry.sourceOperationId,
    timestamp: entry.timestamp,
    useCase: entry.useCase,
    debit: debit?.account.family.name ?? null,
    credit: credit?.account.family.name ?? null,
    amountUsd: entry.lines.reduce((sum, line) => sum + debitOf(line), 0),
    token: movement?.token ?? 'usdc',
    rawAmount: movement?.rawAmount ?? '0',
    ...(movement?.rate != null ? { rate: movement.rate } : {}),
    internal: entry.internal,
    memo: entry.memo,
    enrichment: 'not-applicable',
    ...(entry.category ? { category: entry.category } : {}),
    ...(entry.txHash ? { txHash: entry.txHash } : {})
  }
}

/** A deterministic label index for concrete accounts, matching Trial Balance numbering. */
function accountLabels(entries: readonly JournalEntry[]): Map<string, string> {
  const firstSeen = new Map<string, { account: Account; timestamp: number }>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      const known = firstSeen.get(line.account.id)
      if (!known || entry.timestamp < known.timestamp)
        firstSeen.set(line.account.id, { account: line.account, timestamp: entry.timestamp })
    }
  }

  const byFamily = new Map<string, Array<{ account: Account; timestamp: number }>>()
  for (const item of firstSeen.values()) {
    const bucket = byFamily.get(item.account.family.id)
    if (bucket) bucket.push(item)
    else byFamily.set(item.account.family.id, [item])
  }

  const labels = new Map<string, string>()
  for (const bucket of byFamily.values()) {
    const resolved = bucket
      .filter((item) => item.account.resolution === 'resolved')
      .sort((a, b) => a.timestamp - b.timestamp || a.account.id.localeCompare(b.account.id))
    const split = resolved.length > 1
    for (const [number, item] of resolved.entries()) {
      labels.set(
        item.account.id,
        split && number > 0 ? `${item.account.family.name} ${number + 1}` : item.account.family.name
      )
    }
    for (const item of bucket.filter((item) => item.account.resolution === 'unresolved')) {
      labels.set(item.account.id, `${item.account.family.name} (unresolved)`)
    }
  }
  return labels
}

/** Concrete accounts a set of journal entries touches, in their display order. */
export function journalLedgerAccounts(
  entries: readonly JournalEntry[]
): JournalAccountFilterOption[] {
  const labels = accountLabels(entries)
  return [...labels]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
}

/** Keep complete JournalEntry records that touch any selected concrete account. */
export function filterJournalLedgerByAccount(
  entries: readonly JournalEntry[],
  accounts: readonly string[]
): JournalEntry[] {
  const wanted = new Set(accounts)
  return entries.filter((entry) => entry.lines.some((line) => wanted.has(line.account.id)))
}

/** Currency symbols present on individual journal lines. */
export function journalLedgerCurrencies(entries: readonly JournalEntry[]): string[] {
  const currencies = new Set<string>()
  for (const entry of entries) {
    for (const line of entry.lines) {
      if (line.movement) currencies.add(currencySymbol(line.movement.token))
    }
  }
  return [...currencies].sort()
}

/** Keep complete JournalEntry records containing at least one selected-currency line. */
export function filterJournalLedgerByCurrency(
  entries: readonly JournalEntry[],
  currencies: readonly string[]
): JournalEntry[] {
  const wanted = new Set(currencies)
  return entries.filter((entry) =>
    entry.lines.some((line) => line.movement && wanted.has(currencySymbol(line.movement.token)))
  )
}

/** Journal entries in the reporting period, most recent first. */
export function filterJournalLedgerEntries(
  entries: readonly JournalEntry[],
  from?: Date | null,
  to?: Date | null
): JournalEntry[] {
  return filterByPeriod(entries, from, to)
    .slice()
    .sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id))
}

/** The Devise / Quantité / Taux columns of one journal line's token movement. */
function movementOf(line: JournalEntryLine): Pick<LedgerRow, 'currency' | 'quantity' | 'rate'> {
  if (!line.movement) return NO_MOVEMENT
  let whole = 0
  try {
    whole = wholeTokenAmount(BigInt(line.movement.rawAmount), line.movement.token)
  } catch {
    // A malformed raw amount does not alter the validated reporting amount.
  }
  return {
    currency: currencySymbol(line.movement.token),
    quantity: formatNumber(whole, { maxDecimals: 6 }),
    rate:
      line.movement.rate == null ? '' : `$${formatNumber(line.movement.rate, { maxDecimals: 6 })}`
  }
}

/**
 * Make an internal-transfer narration name the same concrete accounts as its
 * journal rows. The source establishes the debit/credit direction, while the
 * journal lines establish the authoritative deployment identity.
 */
function activityOfJournalEntry(
  source: LedgerEntry,
  entry: JournalEntry,
  labels: ReadonlyMap<string, string>
): ActivityCell {
  const activity = activityOf(source)
  if (activity.kind !== 'transfer') return activity

  const labelOf = (side: 'debit' | 'credit', familyName: string): string => {
    const line = entry.lines.find(
      (candidate) =>
        candidate.account.family.name === familyName &&
        (side === 'debit' ? debitOf(candidate) > 0 : creditOf(candidate) > 0)
    )
    return line ? (labels.get(line.account.id) ?? line.account.family.name) : familyName
  }

  return {
    ...activity,
    from: labelOf('credit', activity.from),
    to: labelOf('debit', activity.to)
  }
}

/** Flatten whole JournalEntry records into the rows consumed by LedgerTable. */
export function journalLedgerRows(
  entries: readonly JournalEntry[],
  labelEntries: readonly JournalEntry[] = entries
): LedgerRow[] {
  const labels = accountLabels(labelEntries)
  const rows: LedgerRow[] = []
  for (const entry of entries) {
    const source = sourceOf(entry)
    entry.lines.forEach((line, index) => {
      const isFirst = index === 0
      const accountLabel = labels.get(line.account.id) ?? line.account.family.name
      rows.push({
        isFirst,
        date: isFirst ? formatUnixDateTime(entry.timestamp) : '',
        label: isFirst ? entryLabel(source) : '',
        ...(isFirst && entry.txHash ? { txHash: entry.txHash } : {}),
        activity: isFirst ? activityOfJournalEntry(source, entry, labels) : NO_ACTIVITY,
        ...(isFirst ? { destination: activityDestinationOf(source) } : {}),
        category: isFirst ? categoryLabelOf(source) : '',
        categoryClass: isFirst ? badgeClassOf(source) : '',
        account: line.account.family.name,
        accountId: line.account.id,
        ...(accountLabel !== line.account.family.name ? { accountLabel } : {}),
        ...(line.account.contractAddress ? { accountInstance: line.account.contractAddress } : {}),
        accountMuted: creditOf(line) > 0,
        accountDimmed: false,
        dr: debitOf(line) > 0 ? money(debitOf(line)) : '',
        cr: creditOf(line) > 0 ? money(creditOf(line)) : '',
        ...movementOf(line)
      })
    })
  }
  return rows
}

/** Sum every selected journal debit line, the General Ledger's gross movement total. */
export function journalLedgerTotal(entries: readonly JournalEntry[]): string {
  return money(
    entries.reduce(
      (sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + debitOf(line), 0),
      0
    )
  )
}

/** General Ledger view for the selected period, concrete accounts and currencies. */
export function presentJournalLedger(
  entries: readonly JournalEntry[],
  from?: Date | null,
  to?: Date | null,
  currencies?: readonly string[] | null,
  accounts?: readonly string[] | null
): { rows: LedgerRow[]; total: string; entryCount: number } {
  const period = filterJournalLedgerEntries(entries, from, to)
  const accountScoped = accounts ? filterJournalLedgerByAccount(period, accounts) : period
  const shown = currencies
    ? filterJournalLedgerByCurrency(accountScoped, currencies)
    : accountScoped
  return {
    rows: journalLedgerRows(shown, entries),
    total: journalLedgerTotal(shown),
    entryCount: shown.length
  }
}

/** General Ledger heading for the selected reporting period. */
export function journalLedgerExportTitle(from?: Date | null, to?: Date | null): string {
  return from || to ? `General Ledger — ${periodLabel(from, to)}` : 'General Ledger'
}
