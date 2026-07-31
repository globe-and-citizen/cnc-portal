/**
 * Canonical truncation for the long hex strings the UI can't show in full.
 *
 * The repo grew five near-identical versions of this, two of which used a `…`
 * character while the rest used `...` — enough of a difference that the same
 * address looked like two different values across two tables. One helper, one
 * ellipsis. See `.github/copilot-instructions/formatting-standards.md`.
 */

/** The single ellipsis form used for every truncated hex value in the app. */
const ELLIPSIS = '...'

export interface TruncateOptions {
  /** Characters kept at the start, `0x` included. Default `6`. */
  lead?: number
  /** Characters kept at the end. Default `4`. */
  tail?: number
}

/**
 * `0x1234567890abcdef…` → `0x1234...cdef`.
 *
 * Values already short enough to read whole are returned untouched — truncating
 * them would add an ellipsis without saving a single character.
 *
 * Display only: never feed the result back to a contract call or a comparison.
 */
export function formatAddress(
  address: string | null | undefined,
  { lead = 6, tail = 4 }: TruncateOptions = {}
): string {
  if (!address) return ''
  if (address.length <= lead + tail) return address
  return address.slice(0, lead) + ELLIPSIS + address.slice(-tail)
}

/**
 * Same shape as {@link formatAddress}, named for the intent so a table column of
 * transaction hashes doesn't read as a column of addresses.
 */
export function formatTxHash(hash: string | null | undefined): string {
  return formatAddress(hash)
}
