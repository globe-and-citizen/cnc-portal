/**
 * The canonical display formatters for `dashboard/`.
 *
 * Kept deliberately identical to `app/src/utils/format/` — the two SPAs render
 * the same figures for the same teams, and a `$1,234.50` here that reads
 * `1 234,50 $` there is how support tickets start. There is no shared package
 * to hold it yet, so the duplication is the price; any change lands in both.
 *
 * ```ts
 * import { formatUsd, formatDate } from '~/utils/format'
 * ```
 *
 * Import from this barrel explicitly — Nuxt's auto-import only scans the top
 * level of `utils/`, and the explicit path is what makes a stray hand-rolled
 * formatter obvious in review and greppable in the codebase.
 *
 * Rules, rationale and the migration ratchet:
 * `.github/copilot-instructions/formatting-standards.md`.
 */

export { EMPTY_VALUE, FORMAT_LOCALE } from './shared'

export {
  formatCompact,
  formatNumber,
  formatPercent,
  formatToken,
  formatUsd,
  type CompactOptions,
  type DecimalOptions,
  type NumericInput,
  type PercentOptions,
  type UsdOptions
} from './number'

export {
  formatDate,
  formatDateIso,
  formatDateRelative,
  formatQuarterRange,
  formatDateShort,
  formatDateShortTime,
  formatDateWeekdayShort,
  formatDateTime,
  formatDateUtc,
  formatDuration,
  formatMonthYear,
  formatTimeOfDay,
  formatWeekdayShort,
  formatYear,
  fromUnix,
  type DateInput
} from './date'

export { formatAddress, formatTxHash, type TruncateOptions } from './address'
