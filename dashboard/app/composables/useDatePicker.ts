import type { Ref } from 'vue'
import type { Range } from '~/types'
import {
  defaultPresetId,
  formatAnchorLabel,
  formatAsOfLabel,
  formatRangeLabel,
  fromDateInputValue,
  isValidRange,
  presetsForMode,
  resolveAsOfDate,
  resolveRange,
  startOfMonth,
  startOfToday,
  stepAnchor,
  toDateInputValue,
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
 * preset + its anchor (or the free Specific-date / Custom-dates inputs) resolve to the
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

  // Free-form inputs: a single Specific date, and a Custom-dates start/end pair.
  const customDate = ref<Date>(startOfToday())
  const customStart = ref<Date>(startOfMonth(startOfToday()))
  const customEnd = ref<Date>(startOfToday())

  // Reflect an externally provided value rather than reverse-matching it to a preset.
  if (model.value instanceof Date && mode === 'date') {
    activeId.value = 'specific'
    customDate.value = model.value
  } else if (model.value && !(model.value instanceof Date) && mode === 'range') {
    activeId.value = 'custom'
    customStart.value = model.value.start
    customEnd.value = model.value.end
  }

  const activePreset = computed<DatePickerPreset>(
    () => presets.find(p => p.id === activeId.value) ?? presets[0]!
  )

  const activeAnchor = computed<Date>(() =>
    activePreset.value.unit ? anchors[activePreset.value.unit] : startOfToday()
  )

  const customRange = computed<Range>(() => ({ start: customStart.value, end: customEnd.value }))

  /** False only while the active *Custom dates* range runs backwards. */
  const isCustomRangeValid = computed(
    () => mode !== 'range' || activeId.value !== 'custom' || isValidRange(customRange.value)
  )

  const resolved = computed<DatePickerValue>(() =>
    mode === 'date'
      ? resolveAsOfDate(activePreset.value, activeAnchor.value, customDate.value)
      : resolveRange(activePreset.value, activeAnchor.value, customRange.value)
  )

  const triggerLabel = computed(() =>
    mode === 'date'
      ? formatAsOfLabel(resolved.value as Date)
      : formatRangeLabel(resolved.value as Range)
  )

  // `<input type="date">` proxies — string (YYYY-MM-DD) in, Date out; selecting the input activates it.
  const dateInput = (source: Ref<Date>, presetId: DatePickerPresetId) =>
    computed<string>({
      get: () => toDateInputValue(source.value),
      set: (value: string) => {
        if (!value) return
        source.value = fromDateInputValue(value)
        activeId.value = presetId
      }
    })

  const customStartInput = dateInput(customStart, 'custom')
  const customEndInput = dateInput(customEnd, 'custom')

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
    isCustomRangeValid,
    customDate,
    customStartInput,
    customEndInput,
    select,
    step,
    anchorLabel,
    isActive
  }
}
