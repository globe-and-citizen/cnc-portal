/**
 * Canonical number, money and token-amount formatting.
 *
 * This module is the **only** place in `app/` allowed to call
 * `Intl.NumberFormat` / `toLocaleString` / `toFixed` for display — ESLint
 * enforces it. See `.github/copilot-instructions/formatting-standards.md`.
 */

import { collapseSignedZero, EMPTY_VALUE, FORMAT_LOCALE, toFiniteNumber } from './shared'

/** Value accepted by every amount formatter — on-chain amounts arrive as decimal strings. */
export type NumericInput = number | string | null | undefined

export interface DecimalOptions {
  /** Trailing zeros are padded up to this many decimals. Default `0`. */
  minDecimals?: number
  /** Digits past this are rounded away. Default `4`. */
  maxDecimals?: number
}

/**
 * `1234.5` → `1,234.5`. Thousands separators, trailing zeros trimmed.
 *
 * The `maxDecimals` default is **4**, not 0: a default of 0 is what let a
 * Community Credit position of `0.2 USDC` render as `0` in production
 * ([#2376](https://github.com/globe-and-citizen/cnc-portal/pull/2376)). Round
 * down deliberately, never by omission.
 */
export function formatNumber(
  value: NumericInput,
  { minDecimals = 0, maxDecimals = 4 }: DecimalOptions = {}
): string {
  const amount = toFiniteNumber(value)
  if (amount === null) return EMPTY_VALUE

  return new Intl.NumberFormat(FORMAT_LOCALE, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals
  }).format(collapseSignedZero(amount, maxDecimals))
}

export interface UsdOptions {
  /** Fixed number of decimals — both the minimum and the maximum. Default `2`. */
  decimals?: number
}

/**
 * `1234.5` → `$1,234.50`, `-12.3` → `-$12.30`.
 *
 * Fixed decimals (a price column where `$5` and `$5.20` don't align is a
 * misread waiting to happen), and a sub-unit residue that rounds to zero
 * renders `$0.00` rather than the alarming `-$0.00`.
 *
 * Pass `decimals: 6` for unit prices, where cents are too coarse to be useful.
 */
export function formatUsd(value: NumericInput, { decimals = 2 }: UsdOptions = {}): string {
  const amount = toFiniteNumber(value)
  if (amount === null) return EMPTY_VALUE

  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(collapseSignedZero(amount, decimals))
}

/**
 * `1234.5, 'USDC'` → `1,234.5 USDC`.
 *
 * Token amounts are *not* money: they keep variable precision (trailing zeros
 * trimmed) because `0.0001 SHER` and `0.00 SHER` are different claims, and the
 * symbol is a suffix rather than a currency prefix.
 */
export function formatToken(
  value: NumericInput,
  symbol: string,
  { maxDecimals = 4 }: Pick<DecimalOptions, 'maxDecimals'> = {}
): string {
  const formatted = formatNumber(value, { maxDecimals })
  return formatted === EMPTY_VALUE ? EMPTY_VALUE : `${formatted} ${symbol}`
}

export interface CompactOptions {
  /** ISO 4217 code driving the symbol. Default `'USD'`. */
  currency?: string
}

/**
 * `1_234_567` → `$1.2M`. For dashboard tiles and chart axes, where the exact
 * figure is noise and the order of magnitude is the message.
 *
 * Never use it on a number the user has to reconcile against another system —
 * `$1.2M` is not a balance, it's a headline.
 */
export function formatCompact(value: NumericInput, { currency = 'USD' }: CompactOptions = {}) {
  const amount = toFiniteNumber(value)
  if (amount === null) return EMPTY_VALUE

  return new Intl.NumberFormat(FORMAT_LOCALE, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(amount)
}

export interface PercentOptions {
  /** Decimals kept on the percentage. Default `2`. */
  decimals?: number
  /** Prefix positive values with `+` — for deltas, where direction is the point. */
  signed?: boolean
}

/**
 * Takes a **ratio, not percentage points**: `0.125` → `12.5%`.
 *
 * That convention is the whole reason this helper exists — every call site that
 * hand-rolled `(a / b * 100).toFixed(1) + '%'` had to remember the `* 100`, and
 * the ones that forgot shipped a `0.12%` that should have read `12%`.
 */
export function formatPercent(
  value: NumericInput,
  { decimals = 2, signed = false }: PercentOptions = {}
): string {
  const ratio = toFiniteNumber(value)
  if (ratio === null) return EMPTY_VALUE

  const safe = collapseSignedZero(ratio, decimals + 2)
  const formatted = new Intl.NumberFormat(FORMAT_LOCALE, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(safe)

  return signed && safe > 0 ? `+${formatted}` : formatted
}
