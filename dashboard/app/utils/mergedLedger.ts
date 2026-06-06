import type { LedgerEntry, LedgerCategory } from '~/utils/accounting'
import type {
  AccountName,
  JournalLine
} from '~/utils/generalLedger'
import type { RealizedTrade } from '~/utils/incomeStatement'

/**
 * Merges the per-activity LedgerEntry feed with the double-entry journal so
 * one table renders both views at once.
 *
 * Each output row is one journal line: the first line of an activity carries
 * the entry-level columns (date, category, market, …), subsequent lines carry
 * only Account / Debit / Credit. SELL / REDEEM / MERGE rows pick up their
 * journal lines from the matching `RealizedTrade` (joined by `asset +
 * timestamp`), so the row also shows cost basis vs proceeds with the realized
 * P&L on its own line. `RESOLUTION_LOSS` has no parent LedgerEntry — we
 * synthesize a virtual one so the user still sees the booking in the same
 * table.
 */

export type MergedColumnKey
  = | 'date'
    | 'category'
    | 'market'
    | 'outcome'
    | 'quantity'
    | 'unitPrice'
    | 'amount'
    | 'cashFlow'
    | 'counterparty'
    | 'source'
    | 'tx'
    | 'account'
    | 'debit'
    | 'credit'

export interface MergedLedgerRow {
  /** Stable row id; unique across the whole table (entry id + line index). */
  id: string
  lineIndex: number
  /** First line of an activity — render the entry-level cells; later lines blank them. */
  isFirst: boolean
  /** Number of journal lines this activity will emit (used for spans / banding). */
  lineCount: number
  entry: LedgerEntry
  account: AccountName | ''
  debit: number
  credit: number
}

interface BuildMergedLedgerInput {
  entries: LedgerEntry[]
  realizedTrades: RealizedTrade[]
}

const SIX = 1e6
function round6(v: number): number {
  return Math.round(v * SIX) / SIX
}

function debitLine(account: AccountName, amount: number): JournalLine {
  return { account, debit: round6(amount), credit: 0 }
}
function creditLine(account: AccountName, amount: number): JournalLine {
  return { account, debit: 0, credit: round6(amount) }
}

/** Lines an activity-driven LedgerEntry produces (DEPOSIT/WITHDRAWAL/BUY/SPLIT/REWARDS). */
function activityLines(entry: LedgerEntry): JournalLine[] {
  switch (entry.category) {
    case 'DEPOSIT':
      return [debitLine('Cash', entry.amount), creditLine('Owner Capital', entry.amount)]
    case 'WITHDRAWAL':
      return [debitLine('Owner Capital', entry.amount), creditLine('Cash', entry.amount)]
    case 'TRADE_BUY':
    case 'SPLIT':
      return [debitLine('Open Contracts', entry.amount), creditLine('Cash', entry.amount)]
    case 'REWARD':
    case 'MAKER_REBATE':
    case 'REFERRAL_REWARD':
      return [debitLine('Cash', entry.amount), creditLine('Rewards Income', entry.amount)]
    default:
      // SELL / REDEEM / MERGE are booked from the matching RealizedTrade.
      // CONVERSION / OTHER produce no journal lines; the row still renders.
      return []
  }
}

/** Lines a RealizedTrade produces (SELL/REDEEM/MERGE/RESOLUTION_LOSS). */
function disposalLines(trade: RealizedTrade): JournalLine[] {
  const lines: JournalLine[] = []
  if (trade.kind === 'RESOLUTION_LOSS') {
    lines.push(debitLine('Trading Losses', trade.costBasis))
    lines.push(creditLine('Open Contracts', trade.costBasis))
    return lines
  }
  if (trade.proceeds > 0) {
    lines.push(debitLine('Cash', trade.proceeds))
  }
  if (trade.realizedPnl < 0) {
    lines.push(debitLine('Trading Losses', -trade.realizedPnl))
  }
  lines.push(creditLine('Open Contracts', trade.costBasis))
  if (trade.realizedPnl > 0) {
    lines.push(creditLine('Trading Gains', trade.realizedPnl))
  }
  return lines
}

/** Join key for RealizedTrade ↔ LedgerEntry: same asset, same timestamp. */
function tradeKey(asset: string | undefined, timestamp: number): string {
  return `${asset ?? 'na'}|${timestamp}`
}

const DISPOSAL_CATEGORIES: ReadonlySet<LedgerCategory> = new Set<LedgerCategory>([
  'TRADE_SELL',
  'REDEEM',
  'MERGE'
])

/** Synthesizes a LedgerEntry for a RESOLUTION_LOSS that has no on-chain row. */
function syntheticResolutionLossEntry(trade: RealizedTrade): LedgerEntry {
  return {
    id: `synthetic-rl-${trade.asset ?? 'na'}-${trade.timestamp}`,
    timestamp: trade.timestamp,
    category: 'OTHER',
    description: `Lost at resolution — ${trade.market}`,
    amount: trade.costBasis,
    cashFlow: 0,
    source: 'polymarket',
    outcome: trade.outcome
  }
}

/**
 * Builds the merged-row source for the Activity Ledger table. Sort order is
 * newest first to match the current Activity Ledger UX.
 */
export function buildMergedLedger(input: BuildMergedLedgerInput): MergedLedgerRow[] {
  // Index realized trades by (asset, timestamp) so SELL/REDEEM/MERGE rows can
  // pick up cost basis + realized P&L from the lot-accounting result.
  const tradesByKey = new Map<string, RealizedTrade>()
  const resolutionLosses: RealizedTrade[] = []
  for (const t of input.realizedTrades) {
    if (t.kind === 'RESOLUTION_LOSS') {
      resolutionLosses.push(t)
    } else {
      tradesByKey.set(tradeKey(t.asset, t.timestamp), t)
    }
  }

  // Compose one bundle per activity = (entry + the journal lines it owns).
  interface Bundle { entry: LedgerEntry, lines: JournalLine[] }
  const bundles: Bundle[] = []

  for (const entry of input.entries) {
    let lines: JournalLine[]
    if (DISPOSAL_CATEGORIES.has(entry.category)) {
      // Look up matching RealizedTrade; pull asset from the entry's id segment
      // when available (entries store the asset only inside outcome/quantity,
      // not as a top-level field — we fall back to the activity's own data).
      // The activity row's `id` is `pm-${tx}-${ts}-${i}`; trade key uses asset.
      // We try the timestamp-only match: realizedTrades are dated to the same
      // activity timestamp, so a per-timestamp lookup over the asset map is
      // enough for the typical case.
      let match: RealizedTrade | undefined
      // We don't have `asset` on LedgerEntry directly — scan once for the
      // disposal at this timestamp (small list, O(n)).
      for (const t of input.realizedTrades) {
        if (t.kind === 'RESOLUTION_LOSS') {
          continue
        }
        if (t.timestamp === entry.timestamp && (t.market === entry.description || t.outcome === entry.outcome)) {
          match = t
          break
        }
      }
      lines = match ? disposalLines(match) : []
    } else {
      lines = activityLines(entry)
    }
    bundles.push({ entry, lines })
  }

  // Append synthetic RESOLUTION_LOSS bundles.
  for (const rl of resolutionLosses) {
    bundles.push({ entry: syntheticResolutionLossEntry(rl), lines: disposalLines(rl) })
  }

  // Sort newest first.
  bundles.sort((a, b) => b.entry.timestamp - a.entry.timestamp)

  // Flatten into rows.
  const rows: MergedLedgerRow[] = []
  for (const bundle of bundles) {
    const lineCount = Math.max(1, bundle.lines.length)
    if (bundle.lines.length === 0) {
      rows.push({
        id: `${bundle.entry.id}-0`,
        lineIndex: 0,
        isFirst: true,
        lineCount,
        entry: bundle.entry,
        account: '',
        debit: 0,
        credit: 0
      })
      continue
    }
    bundle.lines.forEach((line, index) => {
      rows.push({
        id: `${bundle.entry.id}-${index}`,
        lineIndex: index,
        isFirst: index === 0,
        lineCount,
        entry: bundle.entry,
        account: line.account,
        debit: line.debit,
        credit: line.credit
      })
    })
  }

  return rows
}

/** CSV export — one row per journal line (Account / Debit / Credit columns included). */
export function mergedLedgerToCsv(rows: MergedLedgerRow[]): string {
  const header = [
    'Date', 'Category', 'Market', 'Outcome', 'Quantity', 'Unit price',
    'Amount (USD)', 'Cash flow (USD)', 'Counterparty',
    'Account', 'Debit', 'Credit', 'Source', 'Tx hash'
  ]
  const csvRows = rows.map((row) => {
    const entry = row.entry
    const showEntry = row.isFirst
    const date = showEntry && entry.timestamp ? new Date(entry.timestamp * 1000).toISOString() : ''
    return [
      date,
      showEntry ? entry.category : '',
      showEntry ? entry.description : '',
      showEntry ? entry.outcome ?? '' : '',
      showEntry && entry.quantity != null ? String(entry.quantity) : '',
      showEntry && entry.unitPrice != null ? entry.unitPrice.toFixed(4) : '',
      showEntry ? entry.amount.toFixed(2) : '',
      showEntry ? entry.cashFlow.toFixed(2) : '',
      showEntry ? entry.counterparty ?? '' : '',
      row.account,
      row.debit ? row.debit.toFixed(6) : '',
      row.credit ? row.credit.toFixed(6) : '',
      showEntry ? entry.source : '',
      showEntry ? entry.txHash ?? '' : ''
    ]
  })
  return [header, ...csvRows]
    .map(cells => cells.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
