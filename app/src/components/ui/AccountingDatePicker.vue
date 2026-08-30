<script setup lang="ts">
import { computed } from 'vue'
import { CalendarDate, getLocalTimeZone } from '@internationalized/date'
import { useDatePicker } from '@/composables/useDatePicker'
import type { DatePickerMode, DatePickerValue } from '@/utils/datePicker'

/**
 * Dual-mode accounting date picker. Ported from the dashboard so both apps share the picker.
 *
 * - `mode="date"` selects a single "as of" date (Balance Sheet, Positions, …); `v-model` is a `Date`.
 * - `mode="range"` selects a from/to period (Income Statement, Ledger, …); `v-model` is a `Range`.
 *
 * Presets come first with ◀ / ▶ steppers; a UCalendar is the fallback (single in `date` mode,
 * range in `range` mode). All date logic lives in `@/utils/datePicker`, all reactive state in
 * `@/composables/useDatePicker`.
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

const {
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
} = useDatePicker(props.mode, model, props.storageKey)

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
              @click="step(preset, -1)"
            />
            <span class="w-32 text-center text-sm tabular-nums">{{ anchorLabel(preset) }}</span>
            <UButton
              icon="i-heroicons-chevron-right"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Next ${preset.unit}`"
              @click="step(preset, 1)"
            />
          </div>
        </div>

        <!-- Presets first, calendar last. -->
        <div v-if="activePreset.id === 'specific'" class="border-default mt-1 border-t pt-2">
          <UCalendar v-model="calendarDate" :prevent-deselect="true" />
        </div>
        <div v-else-if="activePreset.id === 'custom'" class="border-default mt-1 border-t pt-2">
          <UCalendar v-model="calendarRange" range :number-of-months="2" />
        </div>
      </div>
    </template>
  </UPopover>
</template>
