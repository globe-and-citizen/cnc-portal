/**
 * Multi-token → USD normalization for the accounting pipeline.
 *
 * Every ledger entry is reported in USD (spec §1 "Currency"). A raw on-chain
 * amount is normalized in two steps:
 *   1. **decimals** — divide the integer base units by the token's decimals to
 *      get a whole-token amount (POL/ETH = 18, USDC/USDC.e/USDT = 6, SHER = 6).
 *   2. **rate of record** — multiply by the token's USD price *at the tx date*.
 *
 * ## Rate source
 * - **Stablecoins** (USDC, USDC.e, USDT) are valued at their **$1.00 peg**.
 * - **Native (POL/ETH)** uses the immutable UTC transaction-date market snapshot.
 * - **SHER** uses the compensation multiplier in force for the source operation.
 * - **Safe swaps** use executed consideration: a recognized USD-stablecoin receipt,
 *   otherwise the asset spent. A non-pegged consideration uses the same daily snapshot.
 *   Exchange replay assigns that fixed cost to the net acquired quantity.
 *
 * An unavailable non-pegged rate remains zero-valued but the source movement is
 * retained. Accounting completeness reports the missing rate explicitly.
 */
import { formatUnits } from 'viem'
import type { AssetId, AssetMetadata } from '@/utils/tokens/assets'
import { assetDecimals } from '@/utils/tokens/assets'
import type { JournalEntryDraft } from './journalEntryDraft'

/** Round to the 6-decimal storage precision (spec §3) — never the 2-dp display. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * Resolves the USD price of one whole token at a given time — the
 * "rate of record" for that transaction.
 */
export type UsdRateOfRecord = (tokenId: AssetId, at: Date) => number

/** One non-pegged token/date pair that needs an immutable market snapshot. */
export interface HistoricalRateTarget {
  token: AssetId
  /** UTC calendar date in `YYYY-MM-DD` format. */
  date: string
}

/** Tokens pinned to a $1.00 USD peg. */
const USD_PEGGED_TOKENS: ReadonlySet<AssetId> = new Set<AssetId>(['usdc', 'usdc.e', 'usdt'])

/** Whether a token is a USD-pegged stablecoin (valued at $1.00). */
export function isUsdPegged(tokenId: AssetId): boolean {
  return USD_PEGGED_TOKENS.has(tokenId)
}

/**
 * One-sided execution consideration: stable receipts first, then stablecoins spent, then a
 * single asset spent for a single asset received. A swap with several assets on a side and
 * no stable side has no exact consideration, so each asset received is its own, at market.
 */
export function swapConsiderationEntries(
  entries: readonly JournalEntryDraft[]
): JournalEntryDraft[] {
  const incoming = entries.filter((entry) => entry.debit === 'Cash — Safe')
  const outgoing = entries.filter((entry) => entry.credit === 'Cash — Safe')
  const received = new Set(incoming.map((entry) => entry.token))
  const spent = new Set(outgoing.map((entry) => entry.token))
  if (!received.size || !spent.size || [...received].some((token) => spent.has(token))) return []
  if ([...received].every(isUsdPegged)) return incoming
  if ([...spent].every(isUsdPegged) || (spent.size === 1 && received.size === 1)) return outgoing
  return incoming
}

/** Several assets received share the consideration by their market value. */
export function swapNeedsReceivedRates(entries: readonly JournalEntryDraft[]): boolean {
  const incoming = entries.filter((entry) => entry.debit === 'Cash — Safe')
  return new Set(incoming.map((entry) => entry.token)).size > 1
}

/** Only the execution consideration needs a USD reference, never the asset acquired with it. */
function swapRateIds(entries: readonly JournalEntryDraft[]): Set<string> {
  const groups = new Map<string, JournalEntryDraft[]>()
  for (const entry of entries) {
    if (entry.useCase !== 'SAFE-SWAP') continue
    const key = entry.txHash?.toLowerCase() ?? entry.sourceOperationId ?? entry.id
    const group = groups.get(key) ?? []
    group.push(entry)
    groups.set(key, group)
  }
  return new Set(
    [...groups.values()].flatMap((group) => [
      ...swapConsiderationEntries(group).map((entry) => entry.id),
      ...(swapNeedsReceivedRates(group)
        ? group.filter((entry) => entry.debit === 'Cash — Safe').map((entry) => entry.id)
        : [])
    ])
  )
}

/** Canonical UTC calendar date used by historical rate query identities. */
export function utcRateDate(at: Date): string {
  if (!Number.isFinite(at.getTime())) throw new Error('Historical rate requires a valid date')
  return at.toISOString().slice(0, 10)
}

/**
 * Derive the unique market-rate snapshots required by a raw Accounting feed.
 * Stablecoins and SHER already have domain-owned rates and require no market read.
 */
export function historicalRateTargets(
  entries: readonly JournalEntryDraft[]
): HistoricalRateTarget[] {
  const targets = new Map<string, HistoricalRateTarget>()
  const swapRates = swapRateIds(entries)
  for (const entry of entries) {
    if (
      (entry.useCase === 'SAFE-SWAP' && !swapRates.has(entry.id)) ||
      (entry.debit === null && entry.credit === null) ||
      BigInt(entry.rawAmount) === 0n ||
      isUsdPegged(entry.token) ||
      entry.token === 'sher' ||
      (entry.carryingAmount !== undefined && entry.carryingAmount > 0n)
    ) {
      continue
    }

    const target = {
      token: entry.token,
      date: utcRateDate(new Date(entry.timestamp * 1000))
    }
    targets.set(`${target.token}:${target.date}`, target)
  }
  return [...targets.values()].sort(
    (left, right) => left.date.localeCompare(right.date) || left.token.localeCompare(right.token)
  )
}

/**
 * Default rate-of-record source: stablecoins are handled by {@link toUsd} at
 * their peg, so this only runs for a non-pegged token whose source was omitted.
 */
const requireRateOfRecord: UsdRateOfRecord = (tokenId) => {
  throw new Error(
    `No USD rate-of-record for "${tokenId}". Native (POL/ETH) and SHER need a ` +
      `historical market or compensation-multiplier source — pass a ` +
      `rateOfRecord resolver to toUsd().`
  )
}

/**
 * The USD-per-whole-token **rate of record** (spec §2 "Taux") for a transaction:
 * exactly `1.000000` for USD-pegged stablecoins (the peg), otherwise the injected
 * resolver's price at that instant. Kept at 6-dp storage precision so the same
 * rate that values the entry is the one shown in the ledger's "Rate" column.
 */
export function tokenUsdRate(
  tokenId: AssetId,
  at: Date,
  rateOfRecord: UsdRateOfRecord = requireRateOfRecord
): number {
  return round6(isUsdPegged(tokenId) ? 1 : rateOfRecord(tokenId, at))
}

/** Whole-token quantity (spec §2 "Quantité") of a raw base-unit amount. */
export function wholeTokenAmount(
  amount: bigint,
  tokenId: AssetId,
  metadata?: AssetMetadata
): number {
  const decimals = assetDecimals(tokenId, metadata)
  if (decimals === null) throw new Error('Asset decimals unavailable')
  return Number(formatUnits(amount, decimals))
}

/** Stamp market-valued entries without changing stablecoin or SHER valuation policy. */
export function applyHistoricalRates(
  entries: readonly JournalEntryDraft[],
  rateOfRecord: UsdRateOfRecord
): JournalEntryDraft[] {
  const swapRates = swapRateIds(entries)
  return entries.map((entry) => {
    if (
      isUsdPegged(entry.token) ||
      entry.token === 'sher' ||
      BigInt(entry.rawAmount) === 0n ||
      (entry.useCase === 'SAFE-SWAP' && !swapRates.has(entry.id))
    ) {
      return entry
    }

    const at = new Date(entry.timestamp * 1000)
    const rate = tokenUsdRate(entry.token, at, rateOfRecord)
    return { ...entry, rate }
  })
}

/**
 * Normalize a raw on-chain token amount to USD: `Quantité × Taux`, stored at
 * 6-dp precision (spec §2–3). For USD-pegged stablecoins the rate is `1.000000`,
 * so the USD amount equals the quantity exactly.
 *
 * @param amount  Raw amount in the token's base units (e.g. wei for native).
 * @param tokenId The token being normalized.
 * @param at      The transaction date — drives the rate of record.
 * @param rateOfRecord Resolver for non-pegged tokens (native, SHER). Pegged
 *   stablecoins ignore it and use $1.00. Defaults to {@link requireRateOfRecord}.
 * @returns The USD value as a number, rounded to 6 decimals.
 */
export function toUsd(
  amount: bigint,
  tokenId: AssetId,
  at: Date,
  rateOfRecord: UsdRateOfRecord = requireRateOfRecord
): number {
  return round6(wholeTokenAmount(amount, tokenId) * tokenUsdRate(tokenId, at, rateOfRecord))
}
