import type { Ref } from 'vue'
import type { Range } from '~/types'
import {
  defaultPresetId,
  formatAnchorLabel,
  formatAsOfLabel,
  formatRangeLabel,
  isValidRange,
  presetsForMode,
  resolveAsOfDate,
  resolveRange,
  startOfMonth,
  startOfToday,
  stepAnchor,
  type AnchorUnit,
  type DatePickerMode,
  type DatePickerPreset,
  type DatePickerPresetId,
  type DatePickerValue
} from '~/utils/datePicker'

/**
 * Reactive state for the dual-mode {@link AccountingDatePicker}.
 *
 * Each steppable preset keeps its own independent anchor, so the dropdown can show
 * `End of month → February 2026` next to `End of quarter → Jul – Sep 2025`. The active
 * preset + its anchor (or the free Specific-date / Custom-dates calendars) resolve to the
 * value pushed through `v-model`. Pure resolution / formatting lives in `~/utils/datePicker`.
 */
export function useDatePicker(mode: DatePickerMode, model: Ref<DatePickerValue | undefined>) {
  const presets = presetsForMode(mode)
  const activeId = ref<DatePickerPresetId>(defaultPresetId(mode))

  // One independent anchor per steppable unit, all starting at today.
  const anchors = reactive<Record<AnchorUnit, Date>>({
    month: startOfToday(),
    quarter: startOfToday(),
    year: startOfToday()
  })

  // Specific date (single UCalendar selection).
  const customDate = ref<Date>(startOfToday())

  // Custom range. `customStart` / `customEnd` mirror the UCalendar range selection exactly —
  // reka-ui emits a partial `{ start, end: undefined }` mid-selection, so these stay nullable
  // and are never merged with stale values. `committedCustom` keeps the last complete, ordered
  // range and is what actually resolves to the model.
  const customStart = ref<Date | null>(startOfMonth(startOfToday()))
  const customEnd = ref<Date | null>(startOfToday())
  const committedCustom = ref<Range>({ start: startOfMonth(startOfToday()), end: startOfToday() })

  // Reflect an externally provided value rather than reverse-matching it to a preset.
  if (model.value instanceof Date && mode === 'date') {
    activeId.value = 'specific'
    customDate.value = model.value
  } else if (model.value && !(model.value instanceof Date) && mode === 'range') {
    activeId.value = 'custom'
    customStart.value = model.value.start
    customEnd.value = model.value.end
    committedCustom.value = { start: model.value.start, end: model.value.end }
  }

  // Commit a custom selection only once both ends are present and ordered.
  watch([customStart, customEnd], ([start, end]) => {
    if (start && end && start.getTime() <= end.getTime()) {
      committedCustom.value = { start, end }
    }
  })

  const activePreset = computed<DatePickerPreset>(
    () => presets.find(p => p.id === activeId.value) ?? presets[0]!
  )

  const activeAnchor = computed<Date>(() =>
    activePreset.value.unit ? anchors[activePreset.value.unit] : startOfToday()
  )

  const resolved = computed<DatePickerValue>(() =>
    mode === 'date'
      ? resolveAsOfDate(activePreset.value, activeAnchor.value, customDate.value)
      : resolveRange(activePreset.value, activeAnchor.value, committedCustom.value)
  )

  const triggerLabel = computed(() =>
    mode === 'date'
      ? formatAsOfLabel(resolved.value as Date)
      : formatRangeLabel(resolved.value as Range)
  )

  function select(id: DatePickerPresetId) {
    activeId.value = id
  }

  /** Step a preset's anchor and make it the active selection. */
  function step(preset: DatePickerPreset, direction: -1 | 1) {
    if (!preset.unit) return
    anchors[preset.unit] = stepAnchor(anchors[preset.unit], preset.unit, direction)
    activeId.value = preset.id
  }

  function anchorLabel(preset: DatePickerPreset): string {
    return preset.unit ? formatAnchorLabel(anchors[preset.unit], preset.unit) : ''
  }

  const isActive = (id: DatePickerPresetId) => activeId.value === id

  // Emit the resolved value to the model; never emit an invalid (backwards) range.
  watch(
    resolved,
    (value) => {
      if (mode === 'range' && !isValidRange(value as Range)) return
      model.value = value
    },
    { immediate: true }
  )

  return {
    presets,
    activePreset,
    triggerLabel,
    customDate,
    customStart,
    customEnd,
    select,
    step,
    anchorLabel,
    isActive
  }
}
