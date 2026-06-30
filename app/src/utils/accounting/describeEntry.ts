/**
 * Human-readable labelling of ledger entries — the "labélisation" layer.
 *
 * The general ledger should read like a story ("Georges submitted 16h", "Ravi
 * contributed $500 in capital"), not like a row of use-case codes and raw
 * addresses. {@link describeEntry} narrates each {@link LedgerEntry} from the data
 * the pipeline already carries — the counterparty (resolved to a member name via
 * {@link makeNameResolver}), the use case, the amount, and the minutes worked —
 * with no extra fetch and no persistence.
 *
 * Entries with no human actor (internal moves, protocol fees, unclassified cash)
 * fall back to the generic per-use-case {@link entryLabel}. Pure and unit-testable.
 */
import { money } from './presenter'
import type { LedgerEntry, UseCase } from './ledgerEntry'

/** Resolve an address to a display name (member name, else a shortened address). */
export type NameResolver = (address?: string | null) => string

/**
 * Normalized accounting-entry label per use case — the generic fallback shown
 * when an entry has no human actor to name (catalogue §5 / spec §4).
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
  FEE: 'Protocol fee',
  INTERNAL: 'Internal transfer',
  'CASH-IN': 'Cash receipt',
  'CASH-OUT': 'Cash payment'
}

/** The generic accounting-entry label a ledger row shows (falls back to the memo). */
export function entryLabel(entry: LedgerEntry): string {
  return ENTRY_LABEL[entry.useCase] ?? entry.memo
}

/** Shorten a 0x address for display, e.g. `0x1234…cdef`. */
export function shortenAddress(address: string): string {
  return address.length > 10 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/**
 * Build a name resolver from a team's members: maps each member address (case
 * insensitive) to its name, and falls back to a shortened address for anyone not
 * on the team (e.g. an external client paying for services).
 */
export function makeNameResolver(
  members: ReadonlyArray<{ address?: string | null; name?: string | null }> | undefined
): NameResolver {
  const byAddress = new Map<string, string>()
  for (const member of members ?? []) {
    const key = member.address?.toLowerCase()
    if (key && member.name) byAddress.set(key, member.name)
  }
  return (address) => {
    if (!address) return ''
    return byAddress.get(address.toLowerCase()) ?? shortenAddress(address)
  }
}

/** Whole hours when the minutes divide evenly, else one decimal — e.g. "16h", "1.5h". */
function formatHours(minutes: number | undefined): string | null {
  if (!minutes || minutes <= 0) return null
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`
}

/**
 * Narrate a ledger entry as a human-readable label. Names the counterparty
 * (member name, else shortened address) and reads the action from the use case;
 * the date lives in its own ledger column, so the label omits it. Entries with no
 * human actor fall back to {@link entryLabel}.
 */
export function describeEntry(entry: LedgerEntry, nameOf: NameResolver): string {
  const who = entry.counterparty ? nameOf(entry.counterparty) : ''
  if (!who) return entryLabel(entry)
  const amount = money(entry.amountUsd)
  const hours = formatHours(entry.minutesWorked)

  switch (entry.useCase) {
    case 'UC-CASH-02':
      return hours ? `${who} submitted ${hours}` : `${who} accrued wages`
    case 'UC-CASH-03':
      return hours ? `${who} was paid for ${hours}` : `${who} was paid wages`
    case 'UC-BANK-01':
      return `${who} contributed ${amount} in capital`
    case 'UC-BANK-02':
      return `${who} paid ${amount} for services`
    case 'UC-SDR-01':
      return `${who} invested ${amount}`
    case 'UC-MEMBER-01':
      // "got N SHER" appears once the SafeDepositRouter feed carries the share
      // count (entry.shares); until then the cash leg alone is narrated.
      return entry.shares
        ? `${who} invested ${amount} in capital and got ${entry.shares} SHER`
        : `${who} invested ${amount} in capital`
    case 'UC-EXP-01':
      return `${who}'s expense reimbursed — ${amount}`
    case 'UC-INV-01':
      return `Dividend of ${amount} paid to ${who}`
    case 'DEFAULT-D':
      return entry.shares ? `${entry.shares} SHER issued to ${who}` : entryLabel(entry)
    default:
      // FEE, INTERNAL, UC-BANK-03, CASH-IN, CASH-OUT — no personal narration.
      return entryLabel(entry)
  }
}
