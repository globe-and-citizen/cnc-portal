<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
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
} from '@/utils/dates/picker'

/**
 * Dual-mode date picker shared by accounting reports and transaction histories.
 *
 * - `mode="date"` selects a single "as of" date (Balance Sheet, Positions, …); `v-model` is a `Date`.
 * - `mode="range"` selects a from/to period (Income Statement, Ledger, …); `v-model` is a `Range`.
 *
 * Presets come first with ◀ / ▶ steppers; a UCalendar is the fallback (single in `date` mode,
 * range in `range` mode). All date logic lives in `@/utils/dates/picker`, all reactive state in
 * this one-consumer component.
 */
const props = withDefaults(
  defineProps<{
    mode?: DatePickerMode
    /** Persist the selection to localStorage under this key (survives tab switch / reload). */
    storageKey?: string
  }>(),
  { mode: 'date' }
)

const model = defineModel<DatePickerValue>()

const presets = presetsForMode(props.mode)

const timestampSchema = z
  .number()
  .finite()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date timestamp')

const datePickerSnapshotSchema = z
  .object({
    activeId: z.custom<DatePickerPresetId>(
      (value) => typeof value === 'string' && presets.some((preset) => preset.id === value),
      'Invalid date picker preset'
    ),
    anchors: z.object({
      month: timestampSchema,
      quarter: timestampSchema,
      year: timestampSchema
    }),
    customDate: timestampSchema,
    customStart: timestampSchema.nullable(),
    customEnd: timestampSchema.nullable()
  })
  .refine(
    (snapshot) =>
      snapshot.customStart === null ||
      snapshot.customEnd === null ||
      snapshot.customStart <= snapshot.customEnd,
    { message: 'Custom range must be ordered', path: ['customEnd'] }
  )

type DatePickerSnapshot = z.infer<typeof datePickerSnapshotSchema>

const activeId = ref<DatePickerPresetId>(defaultPresetId(props.mode))

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

function parseSnapshot(raw: string): DatePickerSnapshot | null {
  try {
    const result = datePickerSnapshotSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function applySnapshot(snapshot: DatePickerSnapshot) {
  activeId.value = snapshot.activeId
  anchors.month = new Date(snapshot.anchors.month)
  anchors.quarter = new Date(snapshot.anchors.quarter)
  anchors.year = new Date(snapshot.anchors.year)
  customDate.value = new Date(snapshot.customDate)
  customStart.value = snapshot.customStart == null ? null : new Date(snapshot.customStart)
  customEnd.value = snapshot.customEnd == null ? null : new Date(snapshot.customEnd)
  if (snapshot.customStart != null && snapshot.customEnd != null) {
    committedCustom.value = {
      start: new Date(snapshot.customStart),
      end: new Date(snapshot.customEnd)
    }
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
// which then throws on read. `parseSnapshot` rejects corrupt, incomplete, stale, and
// mode-incompatible values before they can enter picker state.
const stored = props.storageKey
  ? useLocalStorage<DatePickerSnapshot | null>(props.storageKey, null, {
      serializer: {
        read: parseSnapshot,
        write: (value) => JSON.stringify(value)
      }
    })
  : null

if (stored?.value) {
  applySnapshot(stored.value)
} else if (!props.storageKey) {
  // Uncontrolled (e.g. the demo): reflect an externally provided value instead.
  if (model.value instanceof Date && props.mode === 'date') {
    activeId.value = 'specific'
    customDate.value = model.value
  } else if (model.value && !(model.value instanceof Date) && props.mode === 'range') {
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
  () => presets.find((preset) => preset.id === activeId.value) ?? presets[0]!
)

const activeAnchor = computed<Date>(() =>
  activePreset.value.unit ? anchors[activePreset.value.unit] : startOfToday()
)

const resolved = computed<DatePickerValue>(() =>
  props.mode === 'date'
    ? resolveAsOfDate(activePreset.value, activeAnchor.value, customDate.value)
    : resolveRange(activePreset.value, activeAnchor.value, committedCustom.value)
)

const triggerLabel = computed(() => {
  if (activePreset.value.id === 'allTime') {
    return 'All time'
  }
  return props.mode === 'date'
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
    if (props.mode === 'range' && !isValidRange(value as Range)) return
    model.value = value
  },
  { immediate: true }
)

// @internationalized/date interop for UCalendar.
const toCalendarDate = (date: Date) =>
  new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
const fromCalendarDate = (date: CalendarDate) => date.toDate(getLocalTimeZone())

const calendarDate = computed({
  get: () => toCalendarDate(customDate.value),
  set: (value: CalendarDate | null) => {
    if (!value) return
    customDate.value = fromCalendarDate(value)
    select('specific')
  }
})

// Mirror the range selection exactly — feed `undefined` (not a stale date) for the half the
// user hasn't picked yet, so reka-ui's range state machine stays coherent across clicks.
const calendarRange = computed({
  get: () => ({
    start: customStart.value ? toCalendarDate(customStart.value) : undefined,
    end: customEnd.value ? toCalendarDate(customEnd.value) : undefined
  }),
  set: (value: { start: CalendarDate | null; end: CalendarDate | null }) => {
    customStart.value = value.start ? fromCalendarDate(value.start) : null
    customEnd.value = value.end ? fromCalendarDate(value.end) : null
    select('custom')
  }
})
</script>

<template>
  <UPopover :content="{ align: 'start' }">
    <UButton
      color="neutral"
      variant="outline"
      icon="i-heroicons-calendar-days"
      class="group data-[state=open]:bg-elevated"
      data-test="date-picker-trigger"
    >
      <span class="truncate">{{ triggerLabel }}</span>

      <template #trailing>
        <UIcon
          name="i-heroicons-chevron-down"
          class="text-dimmed size-5 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </template>
    </UButton>

    <template #content>
      <div class="w-fit min-w-80 p-1.5">
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="flex items-center justify-between gap-2 rounded-md pr-1"
          :class="isActive(preset.id) ? 'bg-elevated' : 'hover:bg-elevated/50'"
        >
          <button
            type="button"
            class="flex grow items-center gap-2 px-2 py-1.5 text-left text-sm"
            :data-test="`date-picker-preset-${preset.id}`"
            @click="select(preset.id)"
          >
            <UIcon
              name="i-heroicons-check"
              class="text-primary size-4 shrink-0"
              :class="isActive(preset.id) ? 'opacity-100' : 'opacity-0'"
            />
            {{ preset.label }}
          </button>

          <div v-if="preset.unit" class="flex shrink-0 items-center gap-1">
            <UButton
              icon="i-heroicons-chevron-left"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Previous ${preset.unit}`"
              :data-test="`date-picker-${preset.id}-previous`"
              @click="step(preset, -1)"
            />
            <span class="w-32 text-center text-sm tabular-nums">{{ anchorLabel(preset) }}</span>
            <UButton
              icon="i-heroicons-chevron-right"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Next ${preset.unit}`"
              :data-test="`date-picker-${preset.id}-next`"
              @click="step(preset, 1)"
            />
          </div>
        </div>

        <!-- Presets first, calendar last. -->
        <div v-if="activePreset.id === 'specific'" class="border-default mt-1 border-t pt-2">
          <UCalendar
            v-model="calendarDate"
            data-test="date-picker-calendar"
            :prevent-deselect="true"
          />
        </div>
        <div v-else-if="activePreset.id === 'custom'" class="border-default mt-1 border-t pt-2">
          <UCalendar
            v-model="calendarRange"
            data-test="date-picker-calendar"
            range
            :number-of-months="2"
          />
        </div>
      </div>
    </template>
  </UPopover>
</template>
