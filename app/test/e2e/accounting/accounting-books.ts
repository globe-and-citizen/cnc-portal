// Pure projections of what the Accounting screens render. The browser helpers
// scrape the tables; these functions turn that text back into the numbers a
// double-entry assertion needs, so no spec has to parse a money string itself.

/** One flattened General Ledger line, in the canonical column order. */
export interface LedgerLine {
  date: string
  action: string
  transaction: string
  /** Full transaction hash carried by the cell title; empty for a continuation row. */
  txHash: string
  activity: string
  /** Displayed account label: a redeployed pocket is numbered, e.g. `Cash — Bank 2`. */
  account: string
  currency: string
  quantity: string
  rate: string
  dr: string
  cr: string
}

/** One journal entry: its lead row plus every continuation line below it. */
export interface LedgerEntry {
  label: string
  txHash: string
  lines: LedgerLine[]
}

export interface LedgerView {
  entries: LedgerEntry[]
  /** The "Total movements" footer, as shown. */
  total: string
}

/** Stable comparison of every displayed entry and line after the books rebuild. */
export function normalizedLedger(entries: readonly LedgerEntry[]) {
  return entries.map((entry) => ({
    label: entry.label,
    txHash: entry.txHash.toLowerCase(),
    lines: entry.lines.map((line) => ({
      date: line.date,
      action: line.action,
      txHash: line.txHash.toLowerCase(),
      activity: line.activity,
      account: line.account,
      currency: line.currency,
      quantity: line.quantity,
      rate: line.rate,
      debit: line.dr,
      credit: line.cr
    }))
  }))
}

/** A displayed amount as a number; an absent or em-dash cell is zero. */
export function usdValue(text: string): number {
  if (!text || text === '—') return 0
  const value = Number(text.replace(/[$,]/g, ''))
  return Number.isNaN(value) ? 0 : value
}

/** Sum a column of displayed amounts, rounded to cents so float noise never fails a test. */
export function sumUsd(values: readonly string[]): number {
  return Math.round(values.reduce((total, value) => total + usdValue(value), 0) * 100) / 100
}

/**
 * Group flattened ledger rows into journal entries. A row that carries the
 * Transaction label opens an entry; the rows under it are its remaining lines.
 * The trailing "Total movements" footer is returned separately.
 */
export function groupLedgerEntries(rows: readonly LedgerLine[]): LedgerView {
  const footer = rows.at(-1)
  const entries: LedgerEntry[] = []
  for (const line of rows.slice(0, -1)) {
    if (line.transaction) entries.push({ label: line.transaction, txHash: line.txHash, lines: [] })
    entries.at(-1)?.lines.push(line)
  }
  return { entries, total: footer?.dr ?? '' }
}

/** The debit and credit totals of one entry. */
export function entryTotals(entry: LedgerEntry): { debit: number; credit: number } {
  return {
    debit: sumUsd(entry.lines.map((line) => line.dr)),
    credit: sumUsd(entry.lines.map((line) => line.cr))
  }
}

/** Every entry carrying the given transaction hash. */
export function entriesForTransaction(
  entries: readonly LedgerEntry[],
  txHash: string
): LedgerEntry[] {
  return entries.filter((entry) => entry.txHash.toLowerCase() === txHash.toLowerCase())
}

/** Transaction hashes that opened more than one journal entry. */
export function duplicatedTransactions(entries: readonly LedgerEntry[]): string[] {
  const seen = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.txHash) continue
    const key = entry.txHash.toLowerCase()
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  return [...seen].filter(([, count]) => count > 1).map(([hash]) => hash)
}

/** Entries whose debits and credits disagree, as a readable failure message. */
export function unbalancedEntries(entries: readonly LedgerEntry[]): string[] {
  return entries.flatMap((entry) => {
    const { debit, credit } = entryTotals(entry)
    return debit === credit ? [] : [`${entry.label} (${entry.txHash}): ${debit} ≠ ${credit}`]
  })
}

/** The concrete account labels one entry touched. */
export function entryAccounts(entry: LedgerEntry): string[] {
  return entry.lines.map((line) => line.account).filter(Boolean)
}
