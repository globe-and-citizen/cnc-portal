/**
 * Activity narration for ledger entries — the "labélisation" layer.
 *
 * The general ledger's "Activity" column reads like a story: an avatar of the
 * actor (or the two contract pockets, for a transfer) plus a short predicate
 * ("submitted 35h · week ending Jun 14", "invested $105.00 in capital"). This
 * module turns a {@link LedgerEntry} into a structured {@link ActivityCell} the
 * table renders; identity (member name + avatar, contract icon) is resolved at
 * render time via `resolveUser`, so this layer stays pure and unit-testable.
 *
 * Entries with no human actor and no pocket-to-pocket move (memo mints,
 * unclassified cash) fall back to the generic per-use-case {@link entryLabel}.
 */
import { money, fmtDate } from './presenter'
import type { LedgerEntry, UseCase } from './ledgerEntry'
import type { AccountName } from './chartOfAccounts'

/**
 * Normalized accounting-entry label per use case — the generic fallback shown in
 * the "Transaction" column and for entries with no actor (catalogue §5 / spec §4).
 */
const ENTRY_LABEL: Record<UseCase, string> = {
  'UC-BANK-01': 'Owner capital contribution',
  'UC-BANK-02': 'Service revenue',
  'UC-BANK-03': 'Treasury funding',
  'UC-SDR-01': 'Investor contribution',
  'UC-MEMBER-01': 'Member capital contribution',
  'UC-CASH-02': 'Wage accrual',
  'UC-CASH-03': 'Wage settlement',
  'UC-EXP-01': 'Operating expense',
  'UC-INV-01': 'Dividend paid',
  'DEFAULT-D': 'Share issuance',
  FEE: 'Transaction fee',
  INTERNAL: 'Internal transfer',
  'CASH-IN': 'Cash receipt',
  'CASH-OUT': 'Cash payment'
}

/** The generic accounting-entry label a ledger row shows (falls back to the memo). */
export function entryLabel(entry: LedgerEntry): string {
  return ENTRY_LABEL[entry.useCase] ?? entry.memo
}

/**
 * The structured "Activity" cell the ledger table renders:
 * - `actor`    — one party's address; show its avatar + the predicate text.
 * - `transfer` — a pocket-to-pocket move; show `from → to` contract avatars.
 * - `plain`    — no actor (memo / unclassified); just the text.
 */
export type ActivityCell =
  | { kind: 'actor'; actor: string; text: string }
  | { kind: 'transfer'; from: AccountName; to: AccountName; actor?: string }
  | { kind: 'plain'; text: string }

/** Internal pocket-to-pocket moves — rendered as two contract avatars (from → to). */
const TRANSFER_USE_CASES: ReadonlySet<UseCase> = new Set<UseCase>(['INTERNAL', 'UC-BANK-03'])

/** Use cases that name a single party (member / investor / client) — avatar + predicate. */
const ACTOR_USE_CASES: ReadonlySet<UseCase> = new Set<UseCase>([
  'UC-CASH-02',
  'UC-CASH-03',
  'UC-BANK-01',
  'UC-BANK-02',
  'UC-SDR-01',
  'UC-MEMBER-01',
  'UC-EXP-01',
  'UC-INV-01',
  'DEFAULT-D'
])

/**
 * Narrate an approved expense withdrawal, adapting to its approval type. A
 * **one-time** approval is single-use, so it names the approved amount
 * ("withdrew $0.80 from a one-time expense approval of $1.00"); a **recurring**
 * one names the balance still available for the current period ("withdrew $0.30
 * for an expense. $0.70 remaining"), or that the budget is now fully used when
 * nothing is left — the ledger date already tells the reader which period it is,
 * so no "today"/"this week" qualifier is needed. An unmatched withdrawal (no
 * approval on file) reads the generic phrase.
 */
function expensePredicate(entry: LedgerEntry, amount: string): string {
  if (entry.expenseFrequencyType === 0 && entry.expenseApprovedUsd != null) {
    return `withdrew ${amount} from a one-time expense approval of ${money(entry.expenseApprovedUsd)}`
  }
  if (entry.expenseFrequencyType != null && entry.expenseRemainingUsd != null) {
    const left =
      entry.expenseRemainingUsd <= 0
        ? 'Budget fully used'
        : `${money(entry.expenseRemainingUsd)} remaining`
    return `withdrew ${amount} for an expense. ${left}`
  }
  return `withdrew ${amount} for an expense`
}

/** Hours and minutes worked — e.g. "16h", "1h 30min", "50min" — never a decimal. */
function formatDuration(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes - hours * 60)
  if (hours === 0) return `${mins}min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}

/**
 * The name-less predicate shown after the actor's avatar (the avatar carries the
 * name). The "· N SHER" tail appears once the entry carries the share count.
 */
function predicate(entry: LedgerEntry): string {
  const amount = money(entry.amountUsd)
  const hours = formatDuration(entry.minutesWorked)
  const sher = entry.shares ? ` and got ${entry.shares} SHER` : ''

  switch (entry.useCase) {
    case 'UC-CASH-02': {
      if (!hours) return 'submitted a wage claim'
      const week = entry.periodEnd ? ` for the week ending ${fmtDate(entry.periodEnd)}` : ''
      return `submitted ${hours} of work${week}`
    }
    case 'UC-CASH-03':
      return hours ? `was paid for ${hours} of work` : 'was paid their wages'
    case 'UC-BANK-01':
      return `contributed ${amount} in capital`
    case 'UC-BANK-02':
      return `paid ${amount} for services`
    case 'UC-SDR-01':
      return `invested ${amount} in capital${sher}`
    case 'UC-MEMBER-01':
      return `invested ${amount} in capital${sher}`
    case 'UC-EXP-01':
      return expensePredicate(entry, amount)
    case 'UC-INV-01':
      return `received a ${amount} dividend`
    case 'DEFAULT-D':
      return entry.shares ? `was issued ${entry.shares} SHER` : entryLabel(entry)
    default:
      return entryLabel(entry)
  }
}

/**
 * Describe a ledger entry's activity as a structured {@link ActivityCell}. A
 * pocket-to-pocket move becomes a `transfer` (cash flows from the credited pocket
 * to the debited one); an entry that names a party becomes an `actor`; anything
 * else is `plain` text.
 */
export function activityOf(entry: LedgerEntry): ActivityCell {
  if (TRANSFER_USE_CASES.has(entry.useCase) && entry.debit && entry.credit) {
    // `actor` (the signer who performed the move) is shown when resolved from the
    // transaction; otherwise the table reads the source pocket as the doer.
    return {
      kind: 'transfer',
      from: entry.credit,
      to: entry.debit,
      ...(entry.initiator ? { actor: entry.initiator } : {})
    }
  }
  if (entry.counterparty && ACTOR_USE_CASES.has(entry.useCase)) {
    return { kind: 'actor', actor: entry.counterparty, text: predicate(entry) }
  }
  return { kind: 'plain', text: entryLabel(entry) }
}

/**
 * Append "· + N SHER" to an actor narration when a compound payroll posting also
 * issued shares, so the grouped entry's single Activity still names the equity
 * part (e.g. "was paid for 5h of work + 10 SHER"). No-op when there are no shares,
 * when the text already mentions SHER, or when the cell names no actor.
 */
export function withSherTail(cell: ActivityCell, sherShares: number): ActivityCell {
  if (sherShares <= 0 || cell.kind !== 'actor' || /SHER/.test(cell.text)) return cell
  return { ...cell, text: `${cell.text} + ${sherShares} SHER` }
}

/** `"0x1234…cdef"` — an address shortened for a text cell; other strings pass through. */
function shortAddress(value: string): string {
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? `${value.slice(0, 6)}…${value.slice(-4)}` : value
}

/** A pocket account name without its `"Cash — "` prefix, matching the on-screen avatar label. */
function pocketName(account: string): string {
  return account.replace(/^Cash — /, '')
}

/**
 * Flatten an {@link ActivityCell} to a single line of text for the Excel/PDF exports —
 * the tabular counterpart of the avatar + predicate the ledger renders on screen.
 * `resolveName` turns a party's address into its display name (member/contract); it
 * defaults to a shortened address so the helper stays pure and usable without a store.
 */
export function activityText(
  cell: ActivityCell,
  resolveName: (address: string) => string = shortAddress
): string {
  switch (cell.kind) {
    case 'actor':
      return `${resolveName(cell.actor)} ${cell.text}`
    case 'transfer': {
      const from = pocketName(cell.from)
      const to = pocketName(cell.to)
      // Mirror the on-screen ledger phrasing exactly (see LedgerTable.vue).
      return cell.actor
        ? `${resolveName(cell.actor)} transferred money from ${from} to ${to}`
        : `${from} transferred money to ${to}`
    }
    case 'plain':
      return cell.text
  }
}
