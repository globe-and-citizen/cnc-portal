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
 * - **Native (POL/ETH)** and **SHER** have **no historical price feed yet** — a
 *   defined price-of-record per period is a Phase 2 gap (spec §6 "FX /
 *   price-of-record": pin a price oracle and store the rate on each entry; SHER
 *   is valued at the agreed mint price). Until that exists, the caller must pass
 *   a {@link UsdRateOfRecord} resolver; the default one throws for these tokens
 *   so the gap is explicit rather than silently producing $0.
 */
import { formatUnits } from 'viem'
import type { TokenId } from '@/constant'
import { getTokenDecimals } from '@/utils/constantUtil'

/**
 * Storage / internal-calculation precision (spec §3): every ledger value — the
 * rate of record, the whole-token quantity and the derived USD amount — is kept
 * and manipulated at **6 decimals**. The final 2-decimal rounding happens once,
 * at render time only (see {@link ./presenter.money}), never here.
 */
export const USD_STORAGE_DECIMALS = 6

/** Round to the 6-decimal storage precision (spec §3) — never the 2-dp display. */
export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6
}

/**
 * Resolves the USD price of one whole token at a given time — the
 * "rate of record" for that transaction. Phase 2 wires this to a price oracle;
 * for now callers inject their own (e.g. the agreed SHER mint price).
 */
export type UsdRateOfRecord = (tokenId: TokenId, at: Date) => number

/** Tokens pinned to a $1.00 USD peg. */
const USD_PEGGED_TOKENS: ReadonlySet<TokenId> = new Set<TokenId>(['usdc', 'usdc.e', 'usdt'])

/** Whether a token is a USD-pegged stablecoin (valued at $1.00). */
export function isUsdPegged(tokenId: TokenId): boolean {
  return USD_PEGGED_TOKENS.has(tokenId)
}

/**
 * Default rate-of-record source: stablecoins are handled by {@link toUsd} at
 * their peg, so this only ever runs for non-pegged tokens — for which there is
 * no feed yet. It throws to surface the Phase 2 gap.
 */
export const requireRateOfRecord: UsdRateOfRecord = (tokenId) => {
  throw new Error(
    `No USD rate-of-record for "${tokenId}". Native (POL/ETH) and SHER need a ` +
      `price-of-record source (Phase 2 oracle / agreed mint price) — pass a ` +
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
