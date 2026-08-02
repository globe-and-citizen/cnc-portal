import type { TokenConfig } from '@/constant'

/** A monetary amount, with its display string precomputed. */
export interface Money {
  value: number
  /** `formatCurrencyShort(value, code)` — e.g. "$1.2K". */
  formatted: string
}

/**
 * The two currencies the currency store ever prices a token in: USD, and
 * whatever the user selected.
 *
 * Keyed by role rather than by currency code on purpose — the store emits
 * exactly these two rows, and when the local currency *is* USD a code-keyed
 * map collapses them into one entry.
 */
export interface CurrencyPair {
  usd: Money
  local: Money
}

/** What one address holds of one token, priced. */
export interface TokenBalance {
  token: TokenConfig
  /** Exact on-chain amount, in the token's smallest unit. */
  raw: bigint
  /** `raw` scaled by the token's decimals. Lossy — compare against `raw`. */
  amount: number
  /** Price of a single token. */
  price: CurrencyPair
  /** Value of the holding: `amount` × price. */
  value: CurrencyPair
}

/** Everything one address holds, plus the aggregate across tokens. */
export interface ContractBalances {
  balances: TokenBalance[]
  total: CurrencyPair
}
