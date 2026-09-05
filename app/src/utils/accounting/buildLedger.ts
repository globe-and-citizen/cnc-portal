/**
 * Ledger consolidation — the entry point of the statement layer (issue #2117).
 *
 * The source mappers (issue #2113) already emit a clean feed of **balanced
 * double-entry postings**: every {@link LedgerEntry} carries one debit account,
 * one credit account and a single USD amount, and a multi-leg event is split
 * into several balanced pairs. This module takes that merged, chronologically
 * sorted feed and:
 *
 * 1. **Eliminates the internal-transfer double count.** A move between two of the
 *    team's own pockets (Safe ⇄ Bank ⇄ payroll/expense, and the fee skim
 *    Bank → FeeCollector) is indexed twice — once by the sending contract and
 *    once by the receiving one — so two identical `internal` postings describe
 *    one economic move. We collapse the twins to a single posting so no internal
 *    transfer or fee is counted twice (the fee dual-write is already deduped in
 *    the fee mapper; this is the cross-contract belt-and-suspenders).
 * Statement projections run only after this consolidated feed has been adapted
 * into the canonical `JournalEntry` collection.
 *
 * Internal moves are kept in the feed (they let the general-ledger view show the
 * funding journal, catalogue §6.2) — they are cash-to-cash, so they net to zero
 * on total cash and never touch the income statement or equity. What matters is
 * that each is recorded exactly once.
 */
import type { LedgerEntry } from './ledgerEntry'

export interface BuiltLedger {
  /** Deduped, chronologically sorted postings — the canonical consolidated feed. */
  entries: LedgerEntry[]
}

/** Round to cents — statement figures are USD reporting currency. */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Content key for an internal posting, so the two contract-side twins collapse. */
function internalKey(entry: LedgerEntry): string {
  return [entry.debit, entry.credit, entry.rawAmount, entry.token, entry.timestamp].join('|')
}

/**
 * Drop the duplicate twin of every internal transfer / fee. Only `internal`
 * postings are deduped — external entries keep their unique source ids. The
 * first occurrence wins (mapper order makes the Bank-side row canonical).
 */
function dedupeInternalTransfers(entries: readonly LedgerEntry[]): LedgerEntry[] {
  const seen = new Set<string>()
  const out: LedgerEntry[] = []
  for (const entry of entries) {
    if (entry.internal) {
      const key = internalKey(entry)
      if (seen.has(key)) continue
      seen.add(key)
    }
    out.push(entry)
  }
  return out
}

/** Whether a posting moves real value (memo-only Default-D entries have no legs). */
function isMonetary(entry: LedgerEntry): boolean {
  return entry.debit !== null || entry.credit !== null
}

/**
 * An **unpriced** posting: real accounts, but $0.00 with no rate of record — a
 * native (POL/ETH) leg no price-of-record resolved for. In a USD-reported book it
 * moves nothing and only clutters the journal, so it is dropped.
 *
 * The `!entry.rate` guard is what makes this "unpriced" rather than merely "tiny":
 * a small but *priced* posting — the 0.5% fee on a few POL, ~$0.003 — carries a
 * real rate and is kept, so its token quantity stays visible even when the USD
 * figure rounds to zero.
 */
function isZeroValuePosting(entry: LedgerEntry): boolean {
  return isMonetary(entry) && round2(entry.amountUsd) === 0 && !entry.shares && !entry.rate
}

/**
 * Consolidate a merged, sorted {@link LedgerEntry} feed into the canonical ledger:
 * collapse internal-transfer twins. The result is then adapted once into the
 * canonical journal before every statement projection runs.
 */
export function buildLedger(entries: readonly LedgerEntry[]): BuiltLedger {
  const deduped = dedupeInternalTransfers(entries)
    .filter((entry) => !isZeroValuePosting(entry))
    .sort((a, b) => a.timestamp - b.timestamp)
  return { entries: deduped }
}
