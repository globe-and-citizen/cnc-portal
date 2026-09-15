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
 *
 * An unavailable non-pegged rate remains zero-valued but the source movement is
 * retained. Accounting completeness reports the missing rate explicitly.
 */
import { formatUnits } from 'viem'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/tokens/metadata'
import type { JournalEntryDraft } from './journalEntryDraft'

/** Round to the 6-decimal storage precision (spec §3) — never the 2-dp display. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * Resolves the USD price of one whole token at a given time — the
 * "rate of record" for that transaction.
 */
export type UsdRateOfRecord = (tokenId: TokenId, at: Date) => number

/** One non-pegged token/date pair that needs an immutable market snapshot. */
export interface HistoricalRateTarget {
  token: TokenId
  /** UTC calendar date in `YYYY-MM-DD` format. */
  date: string
}

/** Tokens pinned to a $1.00 USD peg. */
const USD_PEGGED_TOKENS: ReadonlySet<TokenId> = new Set<TokenId>(['usdc', 'usdc.e', 'usdt'])

/** Whether a token is a USD-pegged stablecoin (valued at $1.00). */
export function isUsdPegged(tokenId: TokenId): boolean {
  return USD_PEGGED_TOKENS.has(tokenId)
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
  for (const entry of entries) {
    if (
      (entry.debit === null && entry.credit === null) ||
      BigInt(entry.rawAmount) === 0n ||
      isUsdPegged(entry.token) ||
      entry.token === 'sher'
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
  tokenId: TokenId,
  at: Date,
  rateOfRecord: UsdRateOfRecord = requireRateOfRecord
): number {
  return round6(isUsdPegged(tokenId) ? 1 : rateOfRecord(tokenId, at))
}

/** Whole-token quantity (spec §2 "Quantité") of a raw base-unit amount. */
export function wholeTokenAmount(amount: bigint, tokenId: TokenId): number {
  return Number(formatUnits(amount, getTokenDecimals(tokenId)))
}

/** Stamp market-valued entries without changing stablecoin or SHER valuation policy. */
export function applyHistoricalRates(
  entries: readonly JournalEntryDraft[],
  rateOfRecord: UsdRateOfRecord
): JournalEntryDraft[] {
  return entries.map((entry) => {
    if (isUsdPegged(entry.token) || entry.token === 'sher' || BigInt(entry.rawAmount) === 0n) {
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
  tokenId: TokenId,
  at: Date,
  rateOfRecord: UsdRateOfRecord = requireRateOfRecord
): number {
  return round6(wholeTokenAmount(amount, tokenId) * tokenUsdRate(tokenId, at, rateOfRecord))
}
