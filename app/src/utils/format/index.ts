/**
 * The canonical display formatters for `app/`.
 *
 * ```ts
 * import { formatUsd, formatDate, formatAddress } from '@/utils/format'
 * ```
 *
 * Import from this barrel, not from the sub-modules — the split is an
 * implementation detail. Deliberately **not** re-exported through
 * `@/utils` (`utils/index.ts`): the explicit path is what makes a stray
 * hand-rolled formatter obvious in review and greppable in the codebase.
 *
 * Rules, rationale and the migration ratchet:
 * `.github/copilot-instructions/formatting-standards.md`.
 */

export { EMPTY_VALUE, FORMAT_LOCALE } from './shared'

export {
  formatCompact,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatToken,
  formatTokenUnits,
  formatUsd,
  type CompactOptions,
  type CurrencyOptions,
  type DecimalOptions,
  type NumericInput,
  type PercentOptions,
  type UsdOptions
} from './number'

export {
  formatDate,
  formatDateIso,
  formatDateRelative,
  formatDateShort,
  formatDateWeekdayShort,
  formatDateTime,
  formatDateUtc,
  formatDuration,
  formatMonthYear,
  formatTimeOfDay,
  formatWeekdayShort,
  fromUnix,
  type DateInput
} from './date'

export { formatAddress, formatTxHash, type TruncateOptions } from './address'
