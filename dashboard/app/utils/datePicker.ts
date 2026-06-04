import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import type { Range } from '~/types'

// `quarterOfYear` enables startOf/endOf/add with the 'quarter' unit (matches the dayjs
// convention used in app/ — see app/src/utils/dayUtils.ts).
dayjs.extend(quarterOfYear)

/**
 * Pure date logic shared by the dual-mode {@link AccountingDatePicker}.
 *
 * - `date` mode resolves a single inclusive "as of" {@link Date}.
 * - `range` mode resolves an inclusive `{ start, end }` {@link Range}.
 *
 * Everything here is framework-agnostic (dayjs only) so it can be unit-tested in
 * isolation; the composable owns the reactive state and the component owns the markup.
 */

export type DatePickerMode = 'date' | 'range'

/** Calendar unit a steppable preset walks over with the ◀ / ▶ controls; also a dayjs unit. */
export type AnchorUnit = 'month' | 'quarter' | 'year'

export type DatePresetId = 'today' | 'endOfMonth' | 'endOfQuarter' | 'endOfYear' | 'specific'
export type RangePresetId = 'month' | 'quarter' | 'year' | 'custom'
export type DatePickerPresetId = DatePresetId | RangePresetId

/** The value emitted through `v-model`: a single `Date` in `date` mode, a `Range` in `range` mode. */
export type DatePickerValue = Date | Range

export interface DatePickerPreset {
  id: DatePickerPresetId
  label: string
  /** Anchor unit for steppable presets; absent for Today / Specific date / Custom dates. */
  unit?: AnchorUnit
}

/** `date`-mode options, presets first and the free calendar last. */
export const DATE_PRESETS: DatePickerPreset[] = [
  { id: 'today', label: 'Today' },
  { id: 'endOfMonth', label: 'End of month', unit: 'month' },
  { id: 'endOfQuarter', label: 'End of quarter', unit: 'quarter' },
  { id: 'endOfYear', label: 'End of year', unit: 'year' },
  { id: 'specific', label: 'Specific date' }
]

/** `range`-mode options, presets first and the free inputs last. */
export const RANGE_PRESETS: DatePickerPreset[] = [
  { id: 'month', label: 'Month', unit: 'month' },
  { id: 'quarter', label: 'Quarter', unit: 'quarter' },
  { id: 'year', label: 'Year', unit: 'year' },
  { id: 'custom', label: 'Custom dates' }
]

export function presetsForMode(mode: DatePickerMode): DatePickerPreset[] {
  return mode === 'date' ? DATE_PRESETS : RANGE_PRESETS
}

/** Sensible default: *Today* for `date` mode, the current *Month* for `range` mode. */
export function defaultPresetId(mode: DatePickerMode): DatePickerPresetId {
  return mode === 'date' ? 'today' : 'month'
}

/** Move an anchor one unit backward (`-1`) or forward (`1`), in place of calendar navigation. */
export function stepAnchor(anchor: Date, unit: AnchorUnit, direction: -1 | 1): Date {
  return dayjs(anchor).add(direction, unit).toDate()
}

/** Label shown between the ◀ / ▶ controls, e.g. `February 2026`, `Jul – Sep 2025`, `2022`. */
export function formatAnchorLabel(anchor: Date, unit: AnchorUnit): string {
  const d = dayjs(anchor)
  switch (unit) {
    case 'month':
      return d.format('MMMM YYYY')
    case 'year':
      return d.format('YYYY')
    case 'quarter':
      return `${d.startOf('quarter').format('MMM')} – ${d.endOf('quarter').format('MMM')} ${d.format('YYYY')}`
  }
}

/** Resolve a `date`-mode preset to its inclusive "as of" date (end of the chosen period / day). */
export function resolveAsOfDate(
  preset: DatePickerPreset,
  anchor: Date,
  customDate: Date,
  now: Date = new Date()
): Date {
  if (preset.id === 'today') return dayjs(now).endOf('day').toDate()
  if (preset.id === 'specific') return dayjs(customDate).endOf('day').toDate()
  return dayjs(anchor).endOf(preset.unit!).toDate()
}

/** Resolve a `range`-mode preset to an inclusive `{ start, end }` range (first → last day). */
export function resolveRange(preset: DatePickerPreset, anchor: Date, custom: Range): Range {
  if (preset.id === 'custom') {
    return { start: dayjs(custom.start).startOf('day').toDate(), end: dayjs(custom.end).endOf('day').toDate() }
  }
  return { start: dayjs(anchor).startOf(preset.unit!).toDate(), end: dayjs(anchor).endOf(preset.unit!).toDate() }
}

/** A range is valid only when it does not run backwards. */
export function isValidRange(range: Range): boolean {
  return range.start.getTime() <= range.end.getTime()
}

const DAY_FORMAT = 'MMM D, YYYY'

/** Trigger-button label for `date` mode, e.g. `As of Jun 3, 2026`. */
export function formatAsOfLabel(date: Date): string {
  return `As of ${dayjs(date).format(DAY_FORMAT)}`
}

/** Trigger-button label for `range` mode, e.g. `From Jan 12, 2026 to Dec 25, 2026`. */
export function formatRangeLabel(range: Range): string {
  return `From ${dayjs(range.start).format(DAY_FORMAT)} to ${dayjs(range.end).format(DAY_FORMAT)}`
}

/** Start of the current day (default anchor for every preset). */
export function startOfToday(): Date {
  return dayjs().startOf('day').toDate()
}

/** Start of the month containing `date` (default lower bound for Custom dates). */
export function startOfMonth(date: Date): Date {
  return dayjs(date).startOf('month').toDate()
}
