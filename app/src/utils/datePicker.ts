import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'

// `quarterOfYear` enables startOf/endOf/add with the 'quarter' unit. Extending here keeps
// this module self-contained (app/src/utils/dayUtils.ts extends utc/isoWeek/weekday only).
dayjs.extend(quarterOfYear)

/**
 * Pure date logic shared by the dual-mode {@link AccountingDatePicker}.
 *
 * Ported verbatim from the dashboard so both apps share the same picker behaviour.
 *
 * - `date` mode resolves a single inclusive "as of" {@link Date}.
 * - `range` mode resolves an inclusive `{ start, end }` {@link Range}.
 *
 * Everything here is framework-agnostic (dayjs only) so it can be unit-tested in
 * isolation; the composable owns the reactive state and the component owns the markup.
 */

/** Inclusive from/to window. */
export interface Range {
  start: Date
  end: Date
}

export type DatePickerMode = 'date' | 'range'

/** Calendar unit a steppable preset walks over with the ◀ / ▶ controls; also a dayjs unit. */
export type AnchorUnit = 'month' | 'quarter' | 'year'

type DatePresetId = 'today' | 'endOfMonth' | 'endOfQuarter' | 'endOfYear' | 'specific'
type RangePresetId = 'allTime' | 'month' | 'quarter' | 'year' | 'custom'
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
const DATE_PRESETS: DatePickerPreset[] = [
  { id: 'today', label: 'Today' },
  { id: 'endOfMonth', label: 'End of month', unit: 'month' },
  { id: 'endOfQuarter', label: 'End of quarter', unit: 'quarter' },
  { id: 'endOfYear', label: 'End of year', unit: 'year' },
  { id: 'specific', label: 'Specific date' }
]

/** `range`-mode options: all-time default first, steppable presets, then the free inputs. */
const RANGE_PRESETS: DatePickerPreset[] = [
  { id: 'allTime', label: 'All time' },
  { id: 'month', label: 'Month', unit: 'month' },
  { id: 'quarter', label: 'Quarter', unit: 'quarter' },
  { id: 'year', label: 'Year', unit: 'year' },
  { id: 'custom', label: 'Custom dates' }
]

export function presetsForMode(mode: DatePickerMode): DatePickerPreset[] {
  return mode === 'date' ? DATE_PRESETS : RANGE_PRESETS
}

/** Sensible default: *Today* for `date` mode, *All time* for `range` mode. */
export function defaultPresetId(mode: DatePickerMode): DatePickerPresetId {
  return mode === 'date' ? 'today' : 'allTime'
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
export function resolveRange(
  preset: DatePickerPreset,
  anchor: Date,
  custom: Range,
  now: Date = new Date()
): Range {
  // All-time: from the epoch through the end of today (no lower bound in practice).
  if (preset.id === 'allTime') {
    return { start: new Date(0), end: dayjs(now).endOf('day').toDate() }
  }
  if (preset.id === 'custom') {
    return {
      start: dayjs(custom.start).startOf('day').toDate(),
      end: dayjs(custom.end).endOf('day').toDate()
    }
  }
  return {
    start: dayjs(anchor).startOf(preset.unit!).toDate(),
    end: dayjs(anchor).endOf(preset.unit!).toDate()
  }
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

/** Inclusive unix-seconds bound — the shape downstream period filters expect. */
export function toUnixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1000)
}

/**
 * The value the picker emits on mount for a given mode (Today / All time).
 * Parents initialise their `v-model` with this so there is never an `undefined`
 * window before the picker's first emit — derived from the same pure resolvers,
 * so the seed always matches what the picker would produce.
 */
export function defaultValueForMode(mode: DatePickerMode): DatePickerValue {
  const anchor = startOfToday()
  const preset = presetsForMode(mode).find((p) => p.id === defaultPresetId(mode))!
  return mode === 'date'
    ? resolveAsOfDate(preset, anchor, anchor)
    : resolveRange(preset, anchor, { start: startOfMonth(anchor), end: anchor })
}
