import {
  addMonths,
  addQuarters,
  addYears,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfYear
} from 'date-fns'
import type { Range } from '~/types'

/**
 * Pure date logic shared by the dual-mode {@link AccountingDatePicker}.
 *
 * - `date` mode resolves a single inclusive "as of" {@link Date}.
 * - `range` mode resolves an inclusive `{ start, end }` {@link Range}.
 *
 * Everything here is framework-agnostic (date-fns only) so it can be unit-tested
 * in isolation; the composable owns the reactive state and the component owns the markup.
 */

export type DatePickerMode = 'date' | 'range'

/** Calendar unit a steppable preset walks over with the ◀ / ▶ controls. */
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

/** `range`-mode options, presets first and the free calendar last. */
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

const UNIT_OPS: Record<
  AnchorUnit,
  { start: (d: Date) => Date, end: (d: Date) => Date, step: (d: Date, amount: number) => Date }
> = {
  month: { start: startOfMonth, end: endOfMonth, step: addMonths },
  quarter: { start: startOfQuarter, end: endOfQuarter, step: addQuarters },
  year: { start: startOfYear, end: endOfYear, step: addYears }
}

/** Move an anchor one unit backward (`-1`) or forward (`1`), in place of calendar navigation. */
export function stepAnchor(anchor: Date, unit: AnchorUnit, direction: -1 | 1): Date {
  return UNIT_OPS[unit].step(anchor, direction)
}

/** Label shown between the ◀ / ▶ controls, e.g. `February 2026`, `Jul – Sep 2025`, `2022`. */
export function formatAnchorLabel(anchor: Date, unit: AnchorUnit): string {
  switch (unit) {
    case 'month':
      return format(anchor, 'MMMM yyyy')
    case 'year':
      return format(anchor, 'yyyy')
    case 'quarter':
      return `${format(startOfQuarter(anchor), 'MMM')} – ${format(endOfQuarter(anchor), 'MMM')} ${format(anchor, 'yyyy')}`
  }
}

/** Resolve a `date`-mode preset to its inclusive "as of" date (end of the chosen period / day). */
export function resolveAsOfDate(
  preset: DatePickerPreset,
  anchor: Date,
  customDate: Date,
  now: Date = new Date()
): Date {
  if (preset.id === 'today') return endOfDay(now)
  if (preset.id === 'specific') return endOfDay(customDate)
  return UNIT_OPS[preset.unit!].end(anchor)
}

/** Resolve a `range`-mode preset to an inclusive `{ start, end }` range (first → last day). */
export function resolveRange(preset: DatePickerPreset, anchor: Date, custom: Range): Range {
  if (preset.id === 'custom') return { start: startOfDay(custom.start), end: endOfDay(custom.end) }
  const ops = UNIT_OPS[preset.unit!]
  return { start: ops.start(anchor), end: ops.end(anchor) }
}

/** A range is valid only when it does not run backwards. */
export function isValidRange(range: Range): boolean {
  return range.start.getTime() <= range.end.getTime()
}

const DAY_FORMAT = 'MMM d, yyyy'

/** Trigger-button label for `date` mode, e.g. `As of Jun 3, 2026`. */
export function formatAsOfLabel(date: Date): string {
  return `As of ${format(date, DAY_FORMAT)}`
}

/** Trigger-button label for `range` mode, e.g. `From Jan 12, 2026 to Dec 25, 2026`. */
export function formatRangeLabel(range: Range): string {
  return `From ${format(range.start, DAY_FORMAT)} to ${format(range.end, DAY_FORMAT)}`
}
