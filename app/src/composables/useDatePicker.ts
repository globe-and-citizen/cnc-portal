import { useLocalStorage } from '@vueuse/core'
import { computed, reactive, ref, watch, type Ref } from 'vue'
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
  type DatePickerValue,
  type Range
} from '@/utils/datePicker'

/**
 * Reactive state for the dual-mode {@link AccountingDatePicker}. Ported from the dashboard.
 *
 * Each steppable preset keeps its own independent anchor, so the dropdown can show
 * `End of month → February 2026` next to `End of quarter → Jul – Sep 2025`. The active
 * preset + its anchor (or the free Specific-date / Custom-dates calendars) resolve to the
 * value pushed through `v-model`. Pure resolution / formatting lives in `@/utils/datePicker`.
 *
 * Pass `storageKey` to persist the full selection (preset + anchors + custom range) to
 * localStorage so it survives tab switches and reloads. When a key is given the stored
 * state — not the incoming model — is the source of truth on init, so the picker restores
 * the actual preset (e.g. "Quarter Apr – Jun 2026") instead of reverse-mapping to "Custom".
 */
interface DatePickerSnapshot {
  activeId: DatePickerPresetId
  anchors: Record<AnchorUnit, number>
  customDate: number
  customStart: number | null
  customEnd: number | null
}

export function useDatePicker(
  mode: DatePickerMode,
  model: Ref<DatePickerValue | undefined>,
  storageKey?: string
) {
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

  function isValidSnapshot(s: unknown): s is DatePickerSnapshot {
    if (!s || typeof s !== 'object') {
      return false
    }
    const snap = s as Partial<DatePickerSnapshot>
    return !!snap.anchors && typeof snap.anchors.month === 'number'
  }

  function applySnapshot(s: DatePickerSnapshot) {
    activeId.value = s.activeId
    anchors.month = new Date(s.anchors.month)
    anchors.quarter = new Date(s.anchors.quarter)
    anchors.year = new Date(s.anchors.year)
    customDate.value = new Date(s.customDate)
    customStart.value = s.customStart == null ? null : new Date(s.customStart)
    customEnd.value = s.customEnd == null ? null : new Date(s.customEnd)
    if (s.customStart != null && s.customEnd != null) {
      committedCustom.value = { start: new Date(s.customStart), end: new Date(s.customEnd) }
    }
  }

  function takeSnapshot(): DatePickerSnapshot {
    return {
      activeId: activeId.value,
      anchors: {
        month: anchors.month.getTime(),
        quarter: anchors.quarter.getTime(),
        year: anchors.year.getTime()
      },
      customDate: customDate.value.getTime(),
      customStart: customStart.value?.getTime() ?? null,
      customEnd: customEnd.value?.getTime() ?? null
    }
  }

  // Persisted selection. An explicit JSON serializer is required: with a `null` default
  // vueuse would otherwise coerce the object via `String()` and write "[object Object]",
  // which then throws on read. `read` tolerates any pre-existing corrupt value.
  const stored = storageKey
    ? useLocalStorage<DatePickerSnapshot | null>(storageKey, null, {
        serializer: {
          read: (raw): DatePickerSnapshot | null => {
            try {
              return JSON.parse(raw) as DatePickerSnapshot
            } catch {
              return null
            }
          },
          write: (value) => JSON.stringify(value)
        }
      })
    : null

  if (stored?.value && isValidSnapshot(stored.value)) {
    applySnapshot(stored.value)
  } else if (!storageKey) {
    // Uncontrolled (e.g. the demo): reflect an externally provided value instead.
    if (model.value instanceof Date && mode === 'date') {
      activeId.value = 'specific'
      customDate.value = model.value
    } else if (model.value && !(model.value instanceof Date) && mode === 'range') {
      activeId.value = 'custom'
      customStart.value = model.value.start
      customEnd.value = model.value.end
      committedCustom.value = { start: model.value.start, end: model.value.end }
    }
  }

  if (stored) {
    watch(
      [
        activeId,
        customDate,
        customStart,
        customEnd,
        () => anchors.month,
        () => anchors.quarter,
        () => anchors.year
      ],
      () => {
        stored.value = takeSnapshot()
      }
    )
  }

  // Commit a custom selection only once both ends are present and ordered.
  watch([customStart, customEnd], ([start, end]) => {
    if (start && end && start.getTime() <= end.getTime()) {
      committedCustom.value = { start, end }
    }
  })

  const activePreset = computed<DatePickerPreset>(
    () => presets.find((p) => p.id === activeId.value) ?? presets[0]!
  )

  const activeAnchor = computed<Date>(() =>
    activePreset.value.unit ? anchors[activePreset.value.unit] : startOfToday()
  )

  const resolved = computed<DatePickerValue>(() =>
    mode === 'date'
      ? resolveAsOfDate(activePreset.value, activeAnchor.value, customDate.value)
      : resolveRange(activePreset.value, activeAnchor.value, committedCustom.value)
  )

  const triggerLabel = computed(() => {
    if (activePreset.value.id === 'allTime') {
      return 'All time'
    }
    return mode === 'date'
      ? formatAsOfLabel(resolved.value as Date)
      : formatRangeLabel(resolved.value as Range)
  })

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
