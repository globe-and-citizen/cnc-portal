/**
 * Primitives shared by the canonical formatters.
 *
 * Nothing here is meant to be imported outside the `format/` barrel — the public
 * surface is the barrel (`format/index.ts`). See
 * `.github/copilot-instructions/formatting-standards.md`.
 */

/**
 * The single locale every formatted value in the app renders in.
 *
 * Deliberately **not** `undefined` (which would follow the browser): a
 * `1,234.50` that becomes `1.234,50` for a French visitor makes screenshots,
 * exports and support threads unreadable, and the UI copy around it is
 * English-only anyway.
 */
export const FORMAT_LOCALE = 'en-US'

/**
 * What a formatter renders when it has nothing to render — a missing value, or
 * one that isn't a finite number / valid date.
 *
 * An em dash, never `'0'` or `'$0.00'`: a zero is a claim about the data, and
 * silently claiming "zero" for "unknown" is how a loading balance reads as an
 * empty wallet.
 */
export const EMPTY_VALUE = '—'

/**
 * Coerce to a finite number, or `null` when the value can't be displayed.
 *
 * Strings are accepted because on-chain amounts reach the UI as decimal
 * strings out of `formatUnits` — parsing them here keeps the `Number(...)`
 * dance out of every call site.
 */
export function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Collapse a value that rounds to zero at `decimals` precision onto a clean
 * positive zero.
 *
 * Without this, `-0.004` at 2 decimals renders as `-$0.00` and JavaScript's
 * negative zero renders as `-0` — both read as "we lost a fraction of a cent"
 * when the honest answer is `$0.00`.
 */
export function collapseSignedZero(value: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) === 0 ? 0 : value
}
